export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store, max-age=0'};
const hosts=['http://openapi.seoul.go.kr:8088','https://openapi.seoul.go.kr:8088','https://openapi.seoul.go.kr'];
async function inspect(key,host,date,suffix){
 const path='/'+encodeURIComponent(key)+'/json/getStnPsgr/1/5/'+date+(suffix===null?'':'/'+suffix);
 try{
  const response=await fetch(host+path,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  const text=await response.text();
  let body;
  try{body=JSON.parse(text);}catch{return {host,date,station:suffix,status:response.status,json:false,sample:text.slice(0,220).replaceAll(key,'[REDACTED]')};}
  const root=body?.getStnPsgr;
  const result=root?.RESULT||body?.RESULT||body?.errorMessage||{};
  const rows=root?.row||[];
  return {host,date,station:suffix,status:response.status,json:true,keys:Object.keys(body||{}), responseHeader:body?.response?.header||null, responseBodyKeys:Object.keys(body?.response?.body||{}), responseBodyTotal:body?.response?.body?.totalCount??null,
   providerCode:String(result.CODE||result.code||''),providerMessage:String(result.MESSAGE||result.message||'').slice(0,180),
   count:Number(root?.list_total_count??-1),
   rowCount:Array.isArray(rows)?rows.length:-1,
   firstRowKeys:Array.isArray(rows)&&rows[0]?Object.keys(rows[0]):[],
   firstStation:rows[0]?{stnCd:rows[0].stnCd,stnNm:rows[0].stnNm,pasngDe:rows[0].pasngDe}:null};
 }catch(e){return {host,date,station:suffix,error:e?.name==='TimeoutError'?'TIMEOUT':'FETCH_FAILURE'};}
}
export async function GET(request){
 const key=process.env.SEOUL_SUBWAY_RIDERSHIP_API_KEY?.trim();
 if(!key)return Response.json({error:'NO_KEY'},{status:503,headers});
 const q=new URL(request.url).searchParams;
 const date=/^\d{8}$/.test(q.get('date')||'')?q.get('date'):'20261118';
 const probes=[
  [hosts[0],date,'0154'],
  [hosts[0],date,'154'],
  [hosts[0],date,null],
  [hosts[0],'20251016',null],
  [hosts[1],date,null],
 ];
 const results=await Promise.all(probes.map(args=>inspect(key,...args)));
 return Response.json({date,results},{headers});
}
