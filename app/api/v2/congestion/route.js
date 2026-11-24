import {getDataset} from '../../../lib/congestion-dataset';
import {getStationByCode} from '../../../lib/station-master';
import {congestionSlot,selectCongestion} from '../../../lib/congestion-data';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const headers={'Cache-Control':'private, no-store, max-age=0'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
export async function GET(request){
 const code=new URL(request.url).searchParams.get('station');
 const station=getStationByCode(code);
 if(!station)return reply({error:'INVALID_STATION'},400);
 const slot=congestionSlot(),startedAt=Date.now();
 if(!/^[1-8]$/.test(station.line))return reply({stationCode:code,slot,values:{}});
 if(!process.env.SEOUL_CONGESTION_API_KEY?.trim())return reply({error:'NOT_CONFIGURED'},503);
 try{
  const data=await getDataset();
  const values=selectCongestion(data.rows,station,slot);
  console.info('[congestion]',{stationCode:code,slot:slot.key,matched:Object.keys(values).length,elapsedMs:Date.now()-startedAt,sourceCount:data.sourceCount});
  return reply({stationCode:code,slot,values,fetchedAt:data.fetchedAt,sourceCount:data.sourceCount});
 }catch(error){
  const allowed=['UPSTREAM_NETWORK','UPSTREAM_HTTP','UPSTREAM_JSON','UPSTREAM_RESULT','UPSTREAM_PAGE','UPSTREAM_SCHEMA','NOT_CONFIGURED'];
  const reason=allowed.includes(error?.message)?error.message:'UNAVAILABLE';
  console.warn('[congestion]',{reason,elapsedMs:Date.now()-startedAt});
  return reply({error:reason},502);
 }
}
