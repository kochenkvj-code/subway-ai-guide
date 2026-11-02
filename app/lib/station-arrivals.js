import {getStationByCode} from './station-master';
import registry from '../data/seoulMetroOfficialStations.json';
const apiNames={'서울역':'서울','총신대입구':'총신대입구(이수)'};
const normalize=value=>String(value||'').normalize('NFC').replace(/\s/g,'');
const known=new Set(registry.map(s=>normalize(s.ko)));
for(const name of ['서울','총신대입구(이수)','이수','당고개'])known.add(normalize(name));
export function arrivalStationConfig(code){
 const s=getStationByCode(code);if(!s)return null;
 const name=apiNames[s.names.ko]||s.names.ko;
 const aliases=[name,s.names.ko,...s.aliases,...(s.names.ko==='불암산'?['당고개']:[])];
 return {station:{stationCode:s.stationCode,name,lineId:s.subwayId,line:s.line+'호선',names:s.names},matchesStation:value=>aliases.some(a=>normalize(a)===normalize(value)),validDirectionName:value=>known.has(normalize(value)),line:s.line};
}
