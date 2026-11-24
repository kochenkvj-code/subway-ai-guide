import {timetableStation,serviceClock} from './timetable-lab-model';
import {operationDays,compileOperationTimetable,normalizeOperationStationCode} from './operation-timetable-model';
import {loadOperationTimetable} from './operation-timetable-provider';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
export async function operationTimetableResponse(request){
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
