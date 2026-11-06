export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};
export async function GET(request){
 const line=new URL(request.url).searchParams.get('line');
 if(!/^[1-9]$/.test(line||''))return Response.json({error:'INVALID_LINE'},{status:400,headers});
 const key=process.env.SEOUL_SUBWAY_POSITION_API_KEY?.trim();
 if(!key)return Response.json({error:'NOT_CONFIGURED'},{status:503,headers});
 try{
 const url='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimePosition/0/1000/'+encodeURIComponent(line+'호선');
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
 const raw=await response.json();
 return Response.json({line,fetchedAt:new Date().toISOString(),upstreamHttpStatus:response.status,raw},{status:response.ok?200:502,headers});
 }catch{return Response.json({error:'UPSTREAM_ERROR'},{status:502,headers});}
}
