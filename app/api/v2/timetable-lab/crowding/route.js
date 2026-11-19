import {staffAuthorized} from '../../../../lib/staff-access';
import {timetableStation} from '../../../../lib/timetable-lab-model';
import {stationCrowdingSource} from '../../../../lib/congestion-data';
import {getDataset} from '../../../../lib/congestion-dataset';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
export async function GET(request){
 if(!staffAuthorized(request))return reply({error:'FORBIDDEN'},403);
 const code=new URL(request.url).searchParams.get('station');
 const station=timetableStation(code);
 if(!station)return reply({error:'INVALID_STATION'},400);
 if(!/^[1-8]$/.test(station.line))return reply({...stationCrowdingSource([],station),stationCode:code});
 try{
  const source=await getDataset();
  const selected=stationCrowdingSource(source.rows,station,source.fetchedAt);
  // One small live-sourced illustration, not the all-station dataset.
  const example=stationCrowdingSource(source.rows,timetableStation('0221'),source.fetchedAt);
  return reply({...selected,data:{...selected.data,...example.data},stationCode:code});
 }catch{
  return reply({error:'UNAVAILABLE'},502);
 }
}
