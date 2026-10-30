// Seoul Metro station facilities. Public demo: show only station-matched, real API records.
export const runtime='nodejs';
export const dynamic='force-dynamic';
const BASE='https://apis.data.go.kr/B553766/facility/';
const TYPES=[
  {id:'elevator',name:'엘리베이터',endpoint:'getFcElvtr'},
  {id:'escalator',name:'에스컬레이터',endpoint:'getFcEsctr'},
  {id:'toilet',name:'화장실',endpoint:'getFcRstrm'},
  {id:'locker',name:'물품보관함',endpoint:'getFcLckr'},
  {id:'nursing',name:'수유실',endpoint:'getFcNrsrm'},
  {id:'atm',name:'ATM',endpoint:'getFcAtm'},
];
const CACHE_MS=300000;
const cache=new Map(), pending=new Map();
function decodeXml(s){
  return String(s).replace(/&#x([a-f\d]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').trim();
}
function xmlTag(s,name){const m=s.match(new RegExp('<(?:[a-zA-Z0-9_]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?'+name+'>','i'));return m?decodeXml(m[1]):'';}
function xmlItems(xml){
  return [...xml.matchAll(/<(?:[a-zA-Z0-9_]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?item>/gi)].map(m=>{
    const out={};
    for(const v of m[1].matchAll(/<([a-zA-Z][\w:-]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g)){
      out[v[1].split(':').at(-1)]=decodeXml(v[2]);
    }
    return out;
  }).filter(x=>Object.keys(x).length);
}
function jsonRows(data){
  const body=data?.response?.body||data?.body||data;
  const items=body?.items?.item??body?.items??body?.item??body?.data?.item??data?.item??data?.data?.items??data?.data;
  return Array.isArray(items)?items:(items&&typeof items==='object'?[items]:[]);
}
function parse(body){
  try{
    const d=JSON.parse(body);
    const h=d?.response?.header||d?.header||{};
    const code=String(h?.resultCode??d?.resultCode??'');
    const message=String(h?.resultMsg??h?.resultMessage??d?.resultMsg??'');
    return {code,message,rows:jsonRows(d),count:d?.response?.body?.totalCount??d?.body?.totalCount??d?.totalCount??null};
  }catch{
    if(!/<(?:\w+:)?(?:response|OpenAPI_ServiceResponse|header|item)(?:\s|>)/i.test(body))throw new Error('UNRECOGNIZED_FORMAT');
    return {code:xmlTag(body,'resultCode'),message:xmlTag(body,'resultMsg'),rows:xmlItems(body),count:Number(xmlTag(body,'totalCount'))||null};
  }
}
function cleanStation(name){return name.normalize('NFKC').replace(/역$/,'').replace(/\s/g,'');}
function matches(row,station,line){
  const name=row.stnNm??row.stnName??row.stationName;
  if(name && cleanStation(String(name))!==cleanStation(station))return false;
  const lineName=row.lineNm??row.lineName;
  if(lineName && line && String(lineName).replace(/\s/g,'')!==line.replace(/\s/g,''))return false;
  // Require a station ID/name: otherwise do not risk showing another station's facility.
  return Boolean(name);
}
function sanitize(row){
  return Object.fromEntries(Object.entries(row).filter(([k])=>!/servicekey|api.?key|secret|token/i.test(k)).map(([k,v])=>[k,v]));
}
async function fetchType(type,key,station,line){
  const u=new URL(BASE+type.endpoint);
  for(const [k,v] of Object.entries({serviceKey:key,dataType:'JSON',numOfRows:'100',pageNo:'1',stnNm:station,lineNm:line}))u.searchParams.set(k,v);
  const res=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(10500)});
  if(!res.ok)throw new Error('UPSTREAM_HTTP_'+res.status);
  const parsed=parse(await res.text());
  if(parsed.code&&!['00','0','INFO-000'].includes(parsed.code)){
    if(['03','04','INFO-200'].includes(parsed.code)||/NO_DATA|NODATA/i.test(parsed.message))return [];
    throw new Error('UPSTREAM_RESULT_'+parsed.code);
  }
  let rows=parsed.rows.filter(r=>r&&typeof r==='object'&&matches(r,station,line));
  // Station-filtered results seldom exceed 100; fetch up to two more pages if needed.
  const total=Number(parsed.count)||0;
  if(total>100){
    for(let page=2;page<=Math.min(Math.ceil(total/100),3);page++){
      u.searchParams.set('pageNo',String(page));
      const response=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(10500)});
      if(!response.ok)throw new Error('PAGE_ERROR');
      const extra=parse(await response.text());
      if(extra.code&&!['00','0','INFO-000'].includes(extra.code))throw new Error('PAGE_ERROR');
      rows.push(...extra.rows.filter(r=>r&&typeof r==='object'&&matches(r,station,line)));
    }
  }
  return rows.map(sanitize);
}
async function load(station,line,key){
  const results=await Promise.allSettled(TYPES.map(type=>fetchType(type,key,station,line)));
  const categories=[],errors=[];
  for(let i=0;i<results.length;i++){
    const r=results[i],type=TYPES[i];
    if(r.status==='rejected'){errors.push(type.id);continue;}
    if(r.value.length)categories.push({id:type.id,name:type.name,count:r.value.length,items:r.value});
  }
  return {station,line,categories,errors,partial:errors.length>0,updatedAt:new Date().toISOString()};
}
export async function GET(req){
  const key=process.env.SEOUL_METRO_FACILITY_API_KEY?.trim();
  if(!key)return Response.json({ok:false,error:'API_KEY_MISSING'},{status:503,headers:{'Cache-Control':'no-store'}});
  const url=new URL(req.url);
  const station=(url.searchParams.get('station')||'종로5가').trim().replace(/역$/,'');
  const line=(url.searchParams.get('line')||'1호선').trim();
  if(!/^[가-힣A-Za-z0-9()·\s-]{2,30}$/.test(station)||!/^(?:[1-9]호선|[가-힣A-Za-z0-9\s-]{2,20})$/.test(line)){
    return Response.json({ok:false,error:'INVALID_STATION'},{status:400,headers:{'Cache-Control':'no-store'}});
  }
  const id=station+'|'+line;
  const cached=cache.get(id);
  if(cached&&Date.now()-cached.at<CACHE_MS)return Response.json({...cached.data,ok:true},{headers:{'Cache-Control':'public, max-age=0, s-maxage=300'}});
  try {
    if(!pending.has(id))pending.set(id,load(station,line,key).finally(()=>pending.delete(id)));
    const data=await pending.get(id);
    if(data.categories.length===0&&data.errors.length===TYPES.length){
      return Response.json({ok:false,error:'ALL_PROVIDERS_FAILED',errors:data.errors},{status:502,headers:{'Cache-Control':'no-store'}});
    }
    // Cache complete successful responses; retry partial failures on the next load.
    if(!data.partial){cache.set(id,{at:Date.now(),data});if(cache.size>25)cache.delete(cache.keys().next().value);}
    return Response.json({...data,ok:true},{headers:{'Cache-Control':data.partial?'no-store':'public, max-age=0, s-maxage=300'}});
  }catch{
    return Response.json({ok:false,error:'FACILITY_LOOKUP_FAILED'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
