// Server-only provider transport shared by the audit and facility endpoint.
const keyName='SEOUL_METRO_STATION_OFFICE_API_KEY';
const cacheDuration=10*60*1000;
let snapshot=null,pending=null;
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
 const pageSize=100;
 const readPage=async page=>{
  const url=new URL('https://apis.data.go.kr/B553766/facility/getFcCstct');
  for(const [k,v] of Object.entries({serviceKey:key,dataType:'XML',numOfRows:String(pageSize),pageNo:String(page)}))url.searchParams.set(k,v);
  const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error('GOV_HTTP_'+res.status);
  return parseGov(await res.text());
 };
 const first=await readPage(1),pages=Math.ceil(first.count/pageSize);
 if(pages>10)throw Error('SOURCE_TOO_LARGE');
 const remaining=await Promise.all(Array.from({length:Math.max(0,pages-1)},(_,i)=>readPage(i+2)));
 const items=[...first.items,...remaining.flatMap(page=>page.items)];
 if(items.length<first.count)throw Error('INCOMPLETE_SOURCE');
 return {items,count:first.count};
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
async function fetchSource(){
 const key=process.env[keyName]?.trim();if(!key)throw Error('NOT_CONFIGURED');
 const seoulKey=/^[0-9a-f]{32}$/i.test(key);
 let source=null,provider=null;
 const portalKey=process.env.SEOUL_METRO_FACILITY_API_KEY?.trim();
 // The government provider is already verified in production. Try it directly
 // instead of waiting on the failing Seoul endpoint on every cold request.
 if(seoulKey&&portalKey){
  try{source=await callGov(portalKey);provider='공공데이터포털 B553766 (기존 시설 키)';}catch{}
 }
 if(!source){
  try{
   if(seoulKey){source=await callSeoul(key);provider='서울 열린데이터광장';}
   else{source=await callGov(key);provider='공공데이터포털 B553766';}
  }catch{}
 }
 if(!source)throw Error(seoulKey?'SEOUL_SOURCE_FAILED':'PORTAL_SOURCE_FAILED');
 return {provider,records:source.items.map(normalizeRow),count:source.count};
}
export async function loadStationOfficeSource(){
 if(snapshot&&Date.now()-snapshot.at<cacheDuration)return snapshot.data;
 if(!pending)pending=fetchSource().then(data=>{snapshot={at:Date.now(),data};return data;}).finally(()=>{pending=null;});
 return pending;
}
