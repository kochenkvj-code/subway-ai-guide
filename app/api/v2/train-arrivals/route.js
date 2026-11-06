import {arrivalStationConfig} from '../../../lib/station-arrivals';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const code=new URL(request.url).searchParams.get('station');
  const config=arrivalStationConfig(code);
  if(!config)return Response.json({error:'INVALID_STATION'},{status:400,headers:{'Cache-Control':'no-store'}});
  const key=process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
  if(!key)return Response.json({error:'NOT_CONFIGURED'},{status:503,headers:{'Cache-Control':'no-store'}});
  try{
    const path=['http://swopenapi.seoul.go.kr/api/subway',encodeURIComponent(key),'json','realtimeStationArrival','0','100',encodeURIComponent(config.apiName)].join('/');
    const response=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    const raw=await response.json();
    // Preserve provider rows and messages without calculating, removing or rearranging trains.
    return Response.json({station:config.station,requestedStationName:config.apiName,fetchedAt:new Date().toISOString(),raw},{
      status:response.ok?200:502,headers:{'Cache-Control':'private, no-store, max-age=0'}
    });
  }catch{
    return Response.json({error:'UPSTREAM_ERROR'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
