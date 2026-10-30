// Fetch full LOST112 item details. Credentials never reach the browser.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SERVICES = {
  police: {
    key: 'LOST112_POLICE_API_KEY',
    url: 'https://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundDetailInfo',
  },
  portal: {
    key: 'LOST112_PORTAL_API_KEY',
    url: 'https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundDetailInfo',
  },
};
const json = (body, status=200) => Response.json(body, {
  status, headers: { 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff' },
});
const decode = str => String(str||'').replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/,'$1')
  .replace(/&#x([\da-f]+);/gi,(_,x)=>String.fromCodePoint(parseInt(x,16)))
  .replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(Number(x)))
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
  .replace(/&apos;/g,"'").replace(/&amp;/g,'&').trim();
function field(xml, name) {
  const m=String(xml).match(new RegExp('<(?:[\\w.-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?'+name+'>','i'));
  return m ? decode(m[1]).slice(0,4000) : '';
}
export async function GET(req) {
  const q=new URL(req.url).searchParams;
  const source=q.get('source')||'';
  const id=q.get('id')||'';
  const sequence=q.get('sequence')||'';
  if(!Object.hasOwn(SERVICES,source)|| !/^[a-zA-Z0-9_-]{4,50}$/.test(id) || !/^\d{1,5}$/.test(sequence))
    return json({ok:false,error:'INVALID_ITEM'},400);
  const svc=SERVICES[source],key=process.env[svc.key]?.trim();
  if(!key) return json({ok:false,error:'KEY_MISSING'},503);
  const url=new URL(svc.url);
  url.searchParams.set('serviceKey',key);
  url.searchParams.set('ATC_ID',id);
  url.searchParams.set('FD_SN',sequence);
  try {
    const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!res.ok) return json({ok:false,error:'UPSTREAM_HTTP'},502);
    const xml=await res.text();
    if(xml.length>700000)return json({ok:false,error:'UPSTREAM_TOO_LARGE'},502);
    const code=field(xml,'resultCode');
    if(!['00','0'].includes(code))return json({ok:false,error:'UPSTREAM_RESULT'},502);
    const item=xml.match(/<(?:[\w.-]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?item>/i)?.[1];
    if(!item)return json({ok:false,error:'DETAIL_NOT_FOUND'},404);
    const get=(name,max=400)=>field(item,name).slice(0,max);
    const rawImage=get('fdFilePathImg',700);
    let image='';
    try {
      const u=new URL(rawImage);
      if(['https:','http:'].includes(u.protocol)){u.protocol='https:';image=u.href;}
    }catch{}
    return json({ok:true,detail:{
      title:get('fdPrdtNm'),category:get('prdtClNm'),date:get('fdYmd'),
      foundPlace:get('fdPlace'),foundHour:get('fdHor'),
      custody:get('csteSteNm'),place:get('depPlace'),
      organization:get('orgNm'),organizationType:get('fndKeepOrgnSeNm'),
      phone:get('tel',60),note:get('uniq',3000),image
    }});
  }catch{return json({ok:false,error:'UPSTREAM_UNAVAILABLE'},502);}
}
