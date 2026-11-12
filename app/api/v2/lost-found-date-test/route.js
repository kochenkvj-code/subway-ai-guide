import {lostFoundStation} from '../../../lib/lost-found-stations';
import {stationCustody,closedCustody,lostDate,koreaDate} from '../../../lib/lost-found-filter';

// Independent, read-only date-first experiment. Does not change the V2 lost-and-found API.
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

const PAGE_SIZE=100;
const MAX_PAGES=250;
const API='https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

function decode(value){
 return String(value||'').replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1')
  .replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
  .replace(/&apos;/g,"'").replace(/&amp;/g,'&').trim();
}
function tag(source,name){
 const pattern=new RegExp('<(?:[\\w.-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?'+name+'>','i');
 const match=String(source).match(pattern);
 return match?decode(match[1]):'';
}
function rows(xml){
 return [...xml.matchAll(/<(?:[\w.-]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?item>/gi)].map(([,block])=>{
  const result={};
  for(const match of block.matchAll(/<([\w:.-]+)(?:\s[^>]*)?>([^<]*|<!\[CDATA\[[\s\S]*?\]\]>)<\/\1>/g)){
   result[match[1].split(':').pop()]=decode(match[2]);
  }
  return result;
 }).filter(row=>Object.keys(row).length>0);
}
export async function GET(request){
 const q=new URL(request.url).searchParams;
 const stationId=q.get('station')||'2546';
 const station=lostFoundStation(stationId);
 const days=Number(q.get('days')||30);
 const page=Number(q.get('page')||1);
 if(!station||!station.stationCode||!([7,30].includes(days))||!Number.isInteger(page)||page<1||page>MAX_PAGES){
  return json({ok:false,error:'INVALID_FILTER'},400);
 }
 const key=process.env.LOST112_PORTAL_API_KEY?.trim();
 if(!key)return json({ok:false,error:'API_KEY_MISSING'},503);
 const start=koreaDate(days-1),end=koreaDate();
 const url=new URL(API);
 url.searchParams.set('serviceKey',key);
 url.searchParams.set('N_FD_LCT_CD','LCA000');
 url.searchParams.set('START_YMD',start.replaceAll('-',''));
 url.searchParams.set('END_YMD',end.replaceAll('-',''));
 url.searchParams.set('pageNo',String(page));
 url.searchParams.set('numOfRows',String(PAGE_SIZE));
 const begun=Date.now();
 try{
  const reply=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!reply.ok)throw new Error('UPSTREAM_HTTP');
  const xml=await reply.text();
  if(xml.length>4500000)throw new Error('UPSTREAM_TOO_LARGE');
  if(!/<(?:[\w.-]+:)?body(?:\s|>)/i.test(xml))throw new Error('UPSTREAM_FORMAT');
  const code=tag(xml,'resultCode');
  const alternate=tag(xml,'returnReasonCode');
  if(alternate&&alternate!=='00')throw new Error('UPSTREAM_AUTH');
  if(code!=='00'&&code!=='0')throw new Error('UPSTREAM_RESULT');
  const rawTotal=tag(xml,'totalCount');
  if(!/^\d+$/.test(rawTotal))throw new Error('MISSING_TOTAL');
  const total=Number(rawTotal);
  if(!Number.isSafeInteger(total)||total<0)throw new Error('INVALID_TOTAL');
  const returnedRows=rows(xml);
  const reportedSize=Number(tag(xml,'numOfRows'));
  const effectiveSize=Number.isInteger(reportedSize)&&reportedSize>0?reportedSize:PAGE_SIZE;
  const totalPages=Math.ceil(total/effectiveSize);
  // Prevent an upstream page-size mismatch from being silently marked complete.
  const paginationUncertain=effectiveSize!==PAGE_SIZE
    ||(page<totalPages&&returnedRows.length===0)
    ||(page===1&&total>PAGE_SIZE&&returnedRows.length<PAGE_SIZE);
  const matching=returnedRows.filter(row=>{
   const date=lostDate(row.fdYmd);
   return date&&date>=start&&date<=end&&stationCustody(row.depPlace,station,row.orgId||'');
  });
  const available=matching.filter(row=>!closedCustody(row.csteSteNm));
  const items=available.map(row=>({
   id:String(row.atcId||'').slice(0,50),
   sequence:String(row.fdSn||'').slice(0,10),
   title:String(row.fdPrdtNm||row.fdSbjt||'이름 미등록 습득물').slice(0,180),
   category:String(row.prdtClNm||'').slice(0,100),
   date:lostDate(row.fdYmd)||'',
   place:String(row.depPlace||'').slice(0,160),
   custody:String(row.csteSteNm||'').slice(0,80)
  }));
  return json({
   ok:true,station:station.stationCode,stationName:station.names.ko,
   stationLine:station.line,source:'LOST112 portal',region:'서울특별시',
   mode:'date-first',start,end,days,page,pageSize:PAGE_SIZE,effectiveSize,
   total,totalPages,maxPages:MAX_PAGES,capped:totalPages>MAX_PAGES,
   scanned:returnedRows.length,matched:matching.length,closed:matching.length-available.length,
   items,paginationUncertain,elapsedMs:Date.now()-begun
  });
 }catch(e){
  const type=e?.name==='TimeoutError'?'UPSTREAM_TIMEOUT':'UPSTREAM_FAILED';
  return json({ok:false,error:type,page,elapsedMs:Date.now()-begun},502);
 }
}
