import {getStationByCode} from '../../../lib/station-master';
import {loadStationOfficeSource} from '../../../lib/station-office-source';
import {stationOfficeFor} from '../../../lib/station-office';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 const headers={'Cache-Control':'no-store'};
 const station=getStationByCode(new URL(request.url).searchParams.get('stationCode'));
 if(!station)return Response.json({ok:false,error:'INVALID_STATION'},{status:400,headers});
 if(station.line==='9'||station.stationCode==='2810')return Response.json({ok:true,stationCode:station.stationCode,status:'excluded',category:null},{headers});
 try{
  const source=await loadStationOfficeSource();
  return Response.json({ok:true,stationCode:station.stationCode,...stationOfficeFor(station,source.records)},{headers:{'Cache-Control':'public, max-age=0, s-maxage=600, stale-while-revalidate=3600'}});
 }catch{return Response.json({ok:false,error:'OFFICE_UNAVAILABLE'},{status:503,headers});}
}
