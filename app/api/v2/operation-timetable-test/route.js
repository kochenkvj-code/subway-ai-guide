import {staffAuthorized} from '../../../lib/staff-access';
import {timetableStation,serviceClock} from '../../../lib/timetable-lab-model';
import {operationDays,compileOperationTimetable,normalizeOperationStationCode} from '../../../lib/operation-timetable-model';
import {loadOperationTimetable} from '../../../lib/operation-timetable-provider';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
export async function GET(request){
 if(!staffAuthorized(request))return reply({ok:false,error:'FORBIDDEN'},403);
 const q=new URL(request.url).searchParams,station=timetableStation(normalizeOperationStationCode(q.get('stationCode'))),day=q.get('day')||'평일';
 if(!station||!Object.hasOwn(operationDays,day))return reply({ok:false,error:'INVALID_QUERY'},400);
 try{
  const source=await loadOperationTimetable(station,day),compiled=compileOperationTimetable(source.rows,station);
  if(source.cacheState==='stale')compiled.issues.push({type:'refresh'});
  return reply({ok:true,stationCode:station.stationCode,line:station.line,day,businessDate:serviceClock().businessDate,...compiled,source:{dataset:source.dataset,revision:source.revision,total:source.total,fetchedAt:source.fetchedAt,cacheState:source.cacheState}});
 }catch(error){
  const allowed=['NOT_CONFIGURED','INVALID_KEY_ENCODING','UPSTREAM_NETWORK','UPSTREAM_HTTP','UPSTREAM_SIZE','UPSTREAM_JSON','UPSTREAM_PAGE','SOURCE_CHANGED','UPSTREAM_FILTER','UPSTREAM_DUPLICATE_PAGE'];
  return reply({ok:false,error:allowed.includes(error.message)?error.message:'UNAVAILABLE'},503);
 }
}
