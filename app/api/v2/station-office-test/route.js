import master from '../../../data/seoulMetroStationMaster.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const keyName='SEOUL_METRO_STATION_OFFICE_API_KEY';
const cacheDuration=10*60*1000;
let snapshot=null, pending=null;
const clean=x=>String(x??'').normalize('NFKC').trim().replace(/역$/,'').replace(/\s/g,'');
const getText=(xml,tag)=>{
 const match=String(xml).match(new RegExp('<(?:[\\w.-]+:)?'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?'+tag+'>','i'));
 return match?match[1].replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim():'';
};
function parseXml(xml){
 const items=[...xml.matchAll(/<(?:[\w.-]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?item>/gi)].map(m=>{
  const record={};for(const key of ['fcltNm','mngNo','lineNm','stnCd','stnNm','stnNo','crtrYmd','grndUdgdSe','stnFlr','dtlPstn','vcntEntrcNo','operInstTelno','utztnPsbltyHr'])record[key]=getText(m[1],key);return record;
 });
 const code=getText(xml,'resultCode')||getText(xml,'CODE');
 const count=Number(getText(xml,'totalCount')||getText(xml,'list_total_count'))||items.length;
 if(!['00','0','INFO-000',''].includes(code))throw Error('UPSTREAM_RESPONSE');
 if(!items.length)throw Error('EMPTY_SOURCE');
 return {items,count};
}
function parseGov(text){
 let data;try{data=JSON.parse(text);}catch{return parseXml(text);}
 const head=data.response?.header||data.header||{},code=String(head.resultCode??data.resultCode??'');
 if(code&&!['00','0','INFO-000'].includes(code))throw Error('UPSTREAM_RESPONSE');
 const body=data.response?.body||data.body||data;
 const raw=body.items?.item??body.items??body.item??body.rows??[];
 const items=(Array.isArray(raw)?raw:[raw]).filter(x=>x&&typeof x==='object'&&x.stnCd);
 if(!items.length)throw Error('EMPTY_SOURCE');
 return {items,count:Number(body.totalCount||data.totalCount||items.length)};
}
async function callGov(key){
 const pageSize=100;let all=[],count=null;
 for(let page=1;page<=10;page++){
  const url=new URL('https://apis.data.go.kr/B553766/facility/getFcCstct');
  for(const [k,v] of Object.entries({serviceKey:key,dataType:'XML',numOfRows:String(pageSize),pageNo:String(page)}))url.searchParams.set(k,v);
  const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error('GOV_HTTP_'+res.status);
  const parsed=parseGov(await res.text());
  all.push(...parsed.items);if(count===null)count=parsed.count;
  if(all.length>=count||parsed.items.length<pageSize)break;
 }
 return {items:all,count:count??all.length};
}
async function callSeoul(key){
 // Seoul Open Data API uses a path key, unlike the B553766 query-key API.
 const hosts=['https://openapi.seoul.go.kr','http://openapi.seoul.go.kr:8088'];
 for(const host of hosts){
  try{
   const url=host+'/'+encodeURIComponent(key)+'/json/getFcCstct/1/1000/';
   const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!res.ok)continue;
   const data=await res.json(),part=data?.getFcCstct;
   if(part?.RESULT?.CODE==='INFO-000'&&Array.isArray(part.row)&&part.row.length){
    return {items:part.row,count:Number(part.list_total_count||part.row.length)};
   }
  }catch{}
 }
 throw Error('SEOUL_UNAVAILABLE');
}
function normalizeRow(r){
 const result={};for(const k of ['fcltNm','mngNo','lineNm','stnCd','stnNm','stnNo','crtrYmd','grndUdgdSe','stnFlr','dtlPstn','vcntEntrcNo','operInstTelno','utztnPsbltyHr'])result[k]=String(r[k]??'').trim();
 return result;
}
async function build(){
 const key=process.env[keyName]?.trim();if(!key)throw Error('NOT_CONFIGURED');
 const seoulKey=/^[0-9a-f]{32}$/i.test(key);
 let source=null,provider=null,failed=null;
 try{
  if(seoulKey){source=await callSeoul(key);provider='서울 열린데이터광장';}
  else{source=await callGov(key);provider='공공데이터포털 B553766';}
 }catch(e){failed=e.message;}
 if(!source){
  // A separate existing government-portal key is always sent only to its own provider.
  const portalKey=process.env.SEOUL_METRO_FACILITY_API_KEY?.trim();
  if(seoulKey&&portalKey){
   try{source=await callGov(portalKey);provider='공공데이터포털 B553766 (기존 시설 키)';}catch{}
  }
 }
 if(!source)throw Error(seoulKey?'SEOUL_SOURCE_FAILED':'PORTAL_SOURCE_FAILED');
 // Compare line-specific canonical codes; keep the unregistered 0200 visible only in this audit.
 const candidates=[...master.stations.map(s=>({stationCode:s.stationCode,line:s.line,name:s.names.ko})),
  {stationCode:'0200',line:'2',name:'까치산'}];
 const records=source.items.map(normalizeRow);
 const rows=candidates.map(s=>{
  const direct=records.filter(r=>r.stnCd===s.stationCode&&clean(r.stnNm)===clean(s.name));
  const sameNameOtherLine=direct.length?[]:records.filter(r=>r.stnCd!==s.stationCode&&clean(r.stnNm)===clean(s.name));
  const status=direct.length?'direct':sameNameOtherLine.length?'sharedCandidate':'missing';
  return {...s,status,offices:direct,otherLineOffices:sameNameOtherLine};
 });
 const stats={baseMaster:master.stations.length,target:rows.length,direct:rows.filter(x=>x.status==='direct').length,
  sharedCandidate:rows.filter(x=>x.status==='sharedCandidate').length,missing:rows.filter(x=>x.status==='missing').length,
  sourceCount:records.length,sourceReportedTotal:source.count,sourceUnmatched:records.filter(r=>!rows.some(x=>x.stationCode===r.stnCd)).length,
  sourceIncomplete:source.count>records.length};
 return {ok:true,provider,fetchedAt:new Date().toISOString(),stats,rows};
}
export async function GET(){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(snapshot&&Date.now()-snapshot.at<cacheDuration)return Response.json(snapshot.data,{headers});
 try{
  if(!pending)pending=build().finally(()=>{pending=null;});
  const data=await pending;snapshot={data,at:Date.now()};
  return Response.json(data,{headers});
 }catch(e){return Response.json({ok:false,error:['NOT_CONFIGURED','SEOUL_SOURCE_FAILED','PORTAL_SOURCE_FAILED'].includes(e.message)?e.message:'UPSTREAM_UNAVAILABLE'},{status:503,headers});}
}
