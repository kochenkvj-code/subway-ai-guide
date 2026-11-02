import master from '../data/seoulMetroStationMaster.json';
const byCode=new Map(master.stations.map(station=>[station.stationCode,station]));
// No default/fallback: the future entry resolver must explicitly choose a known
// station. Source-listed is not a claim of current operator/API verification.
export const stationMaster=master.stations;
export function getStationByCode(code){return typeof code==='string'?byCode.get(code)||null:null;}
export function searchStationMaster(query='',line=''){
 const clean=value=>String(value).normalize('NFKC').toLowerCase().replace(/\s/g,'');
 const key=clean(query);
 return stationMaster.filter(s=>(!line||s.line===line)&&(!key||[s.stationCode,...Object.values(s.names),...s.aliases].some(name=>clean(name).includes(key))));
}
