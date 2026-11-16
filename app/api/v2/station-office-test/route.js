import master from '../../../data/seoulMetroStationMaster.json';
import {loadStationOfficeSource} from '../../../lib/station-office-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const clean=x=>String(x??'').normalize('NFKC').trim().replace(/역$/,'').replace(/\s/g,'');
async function build(){
 const source=await loadStationOfficeSource(),provider=source.provider;
 // Compare line-specific canonical codes; keep the unregistered 0200 visible only in this audit.
 const candidates=[...master.stations.map(s=>({stationCode:s.stationCode,line:s.line,name:s.names.ko})),
  {stationCode:'0200',line:'2',name:'까치산'}];
 const records=source.records;
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
 try{
  const data=await build();
  return Response.json(data,{headers});
 }catch(e){return Response.json({ok:false,error:['NOT_CONFIGURED','SEOUL_SOURCE_FAILED','PORTAL_SOURCE_FAILED'].includes(e.message)?e.message:'UPSTREAM_UNAVAILABLE'},{status:503,headers});}
}
