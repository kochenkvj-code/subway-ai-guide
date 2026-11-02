import {resolveLostSearch,matchesLostItem,MAX_LOST_PAGES} from '../../../lib/lost-found-filter';
// Read-only LOST112 search proxy. Never send service keys or upstream URLs to the browser.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAGE_SIZE = 30;
const PROVIDERS = {
  portal: {
    label: '포털기관',
    env: 'LOST112_PORTAL_API_KEY',
    url: 'https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd',
    searchUrl: 'https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccTpNmCstdyPlace',
  },
  police: {
    label: '경찰관서',
    env: 'LOST112_POLICE_API_KEY',
    url: 'https://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd',
    searchUrl: 'https://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccTpNmCstdyPlace',
  },
};
const reply = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const dt = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === value;
}
function textOf(value) {
  return String(value || '').replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1')
    .replace(/&#x([\da-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x,16)))
    .replace(/&#(\d+);/g, (_, x) => String.fromCodePoint(Number(x)))
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
    .replace(/&apos;/g,"'").replace(/&amp;/g,'&').trim();
}
function tag(source, name) {
  const match = String(source).match(new RegExp('<(?:[\\w.-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?'+name+'>','i'));
  return match ? textOf(match[1]) : '';
}
function itemRows(xml) {
  return [...xml.matchAll(/<(?:[\w.-]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?item>/gi)].map(([_, block]) => {
    const result = {};
    for (const match of block.matchAll(/<([\w:.-]+)(?:\s[^>]*)?>([^<]*|<!\[CDATA\[[\s\S]*?\]\]>)<\/\1>/g)) {
      result[match[1].split(':').pop()] = textOf(match[2]);
    }
    return result;
  }).filter(x => Object.keys(x).length);
}
function safeImage(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:','https:'].includes(url.protocol)) return '';
    url.protocol = 'https:';
    return url.href.slice(0, 700);
  } catch { return ''; }
}
function normalized(row, source) {
  return {
    id: String(row.atcId || '').slice(0, 50),
    sequence: String(row.fdSn || '').slice(0, 10),
    source,
    title: String(row.fdPrdtNm || row.fdSbjt || '이름 미등록 습득물').slice(0, 180),
    subject: String(row.fdSbjt || '').slice(0, 320),
    category: String(row.prdtClNm || '').slice(0, 120),
    color: String(row.clrNm || '').slice(0, 80),
    date: String(row.fdYmd || '').slice(0, 20),
    place: String(row.depPlace || '').slice(0, 160),
    image: safeImage(row.fdFilePathImg),
    custody: String(row.csteSteNm || '').slice(0,80),
    organizationId: String(row.orgId || '').slice(0,40),
  };
}
async function loadOne(id, start, end, page, item, place, preservePlace=false) {
  const provider = PROVIDERS[id];
  const key = process.env[provider.env]?.trim();
  if (!key) throw new Error('KEY_NOT_CONFIGURED');
  const namedSearch = Boolean(item || place);
  const url = new URL(namedSearch ? provider.searchUrl : provider.url);
  url.searchParams.set('serviceKey', key);
  if (namedSearch) {
    // LOST112 name/place endpoint searches across the actual upstream dataset.
    // It does not document date or province filters. Never pretend it does.
    if (item) url.searchParams.set('PRDT_NM', item);
    if (place) {
      // Handles both "종로5가" and "종로5가역" in storage-agency names.
      const term = !preservePlace && place.endsWith('역') && place.length > 2 ? place.slice(0,-1) : place;
      url.searchParams.set('DEP_PLACE', term);
    }
  } else {
    // The area/date endpoint supports region and date filters.
    url.searchParams.set('N_FD_LCT_CD', 'LCA000'); // 서울특별시
    url.searchParams.set('START_YMD', start.replaceAll('-', ''));
    url.searchParams.set('END_YMD', end.replaceAll('-', ''));
  }
  url.searchParams.set('pageNo', String(page));
  url.searchParams.set('numOfRows', String(PAGE_SIZE));
  const result = await fetch(url, { cache:'no-store', signal: AbortSignal.timeout(13500) });
  if (!result.ok) throw new Error('UPSTREAM_HTTP_' + result.status);
  const xml = await result.text();
  if (xml.length > 1500000) throw new Error('RESPONSE_TOO_LARGE');
  const code = tag(xml, 'resultCode');
  const altCode = tag(xml, 'returnReasonCode');
  if (altCode && altCode !== '00') throw new Error('UPSTREAM_AUTH_ERROR');
  if (code !== '00' && code !== '0') throw new Error(code ? 'UPSTREAM_RESULT_' + code.slice(0,8) : 'INVALID_XML_RESPONSE');
  if (!/<(?:[\w.-]+:)?body(?:\s|>)/i.test(xml)) throw new Error('INVALID_XML_RESPONSE');
  const rows = itemRows(xml);
  const totalText = tag(xml, 'totalCount');
  const total = /^\d+$/.test(totalText) ? Number(totalText) : null;
  return {
    items: rows.map(row => normalized(row, id)),
    total,
    hasMore: total !== null ? page * PAGE_SIZE < total : rows.length >= PAGE_SIZE,
  };
}
export async function GET(request) {
 const query=new URL(request.url).searchParams,filters=resolveLostSearch(query);
 const source=query.get('source')||'both';
 const page=Number(query.get('page')||1);
 if(!filters||!['both','portal','police'].includes(source)||!Number.isInteger(page)||page<1||page>MAX_LOST_PAGES)return reply({ok:false,error:'INVALID_FILTER'},400);
 let cursors;try{cursors=query.has('cursors')?JSON.parse(query.get('cursors')):{};}catch{return reply({ok:false,error:'INVALID_CURSOR'},400);}
 if(!cursors||typeof cursors!=='object'||Array.isArray(cursors)||Object.keys(cursors).some(k=>!['portal','police'].includes(k))||Object.values(cursors).some(v=>!Number.isInteger(v)||v<1||v>MAX_LOST_PAGES+1))return reply({ok:false,error:'INVALID_CURSOR'},400);
 const scan=query.get('scan')||'normal';if(!['first','normal'].includes(scan))return reply({ok:false,error:'INVALID_FILTER'},400);
 const ids=filters.scope==='station'?['portal']:source==='both'?['portal','police']:[source];
 const outcomes=await Promise.all(ids.map(async id=>{
  let next=cursors[id]||page,items=[],scanned=0,limited=false,error=null,success=false;
  // Bounded scanning avoids false empty pages while keeping API latency/quotas finite.
  for(let batch=0;batch<(scan==='first'?1:3)&&next<=MAX_LOST_PAGES;batch++){
   try{
    const named=filters.scope==='station';
    const result=await loadOne(id,filters.start,filters.end,next,named?filters.item:'',named?filters.place:'',Boolean(filters.station.stationCode));
    success=true;scanned+=result.items.length;items.push(...result.items.filter(row=>matchesLostItem(row,filters)));
    if(!result.hasMore){next=MAX_LOST_PAGES+1;break;}
    if(next===MAX_LOST_PAGES){limited=true;next++;break;}
    next++;if(items.length>=10)break;
   }catch(e){error=e?.message==='KEY_NOT_CONFIGURED'?'KEY_NOT_CONFIGURED':'LOOKUP_FAILED';if(error==='KEY_NOT_CONFIGURED')next=MAX_LOST_PAGES+1;break;}
  }
  return {id,next,items,scanned,limited,error,success};
 }));
 if(outcomes.every(x=>!x.success&&x.error))return reply({ok:false,error:outcomes.every(x=>x.error==='KEY_NOT_CONFIGURED')?'API_KEY_MISSING':'ALL_SOURCES_FAILED'},502);
 const seen=new Set(),items=[];
 for(const part of outcomes)for(const row of part.items){const key=row.id&&row.sequence?row.id+'|'+row.sequence:[row.source,row.title,row.date,row.place].join('|');if(!seen.has(key)){seen.add(key);items.push(row);}}
 items.sort((a,b)=>b.date.replace(/[^0-9]/g,'').localeCompare(a.date.replace(/[^0-9]/g,'')));
 const errors=outcomes.filter(x=>x.error).map(x=>({source:x.id,error:x.error}));
 return reply({ok:true,items,errors,partial:errors.length>0,nextPages:Object.fromEntries(outcomes.map(x=>[x.id,x.next])),
  ...(filters.station.stationCode?{stationCode:filters.station.stationCode,stationLine:filters.station.line}:{}),
  hasMore:outcomes.some(x=>x.next<=MAX_LOST_PAGES),limited:outcomes.some(x=>x.limited)||query.get('capped')==='1',scanned:outcomes.reduce((sum,x)=>sum+x.scanned,0),
  start:filters.start,end:filters.end,scope:filters.scope,searchMode:filters.scope==='station'?'name-place':'area-date',region:'서울특별시',
  // No assertion that all records in the requested period have been scanned.
  exhaustive:query.get('capped')!=='1'&&!outcomes.some(x=>x.error||x.limited||x.next<=MAX_LOST_PAGES)});
}
