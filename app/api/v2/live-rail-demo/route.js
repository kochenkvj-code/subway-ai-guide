// Isolated preview-only design demo. Real positions are read from the
// existing public production API; no API keys are forwarded to the browser.
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const line=new URL(request.url).searchParams.get('line')||'1';
  if(!/^[1-9]$/.test(line))return Response.json({ok:false,error:'INVALID_LINE'},{status:400,headers:{'Cache-Control':'no-store'}});
  if(process.env.VERCEL_ENV!=='preview')return Response.json({ok:false,error:'DEMO_ONLY'},{status:404,headers:{'Cache-Control':'no-store'}});
  try{
    const upstream=new URL('https://subway-ai-guide.vercel.app/api/v2/train-lost/position');
    upstream.searchParams.set('line',line);
    const response=await fetch(upstream,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('UPSTREAM_'+response.status);
    const data=await response.json();
    if(!data?.ok||!Array.isArray(data.positions))throw new Error('UNEXPECTED_DATA');
    return Response.json({
      ok:true,line,positions:data.positions.map(p=>({
        trainNo:String(p.trainNo||'').slice(0,24),
        line,station:String(p.station||'').slice(0,65),
        status:String(p.status||'').slice(0,12),
        direction:String(p.direction||'').slice(0,4),
        destination:String(p.destination||'').slice(0,70),
        express:Boolean(p.express),receivedAt:p.receivedAt||null
      })),
      fetchedAt:data.fetchedAt,partial:Boolean(data.partial),
      source:'서울시 실시간 열차 위치 API (운영본 공개 조회)'
    },{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({ok:false,error:'LIVE_DATA_UNAVAILABLE'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
