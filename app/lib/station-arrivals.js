import {getStationByCode} from './station-master';
import registry from '../data/seoulMetroOfficialStations.json';
// Seoul TOPIS realtimeStationArrival uses these specific station labels, which
// often retain parenthesized legacy names even though the public station master
// uses shorter/current names. Verified against a live ALL feed on 2026-11-06.
// Key by station code to avoid mixing shared station names across lines.
const apiNames={
 '0150':'서울',
 '0426':'서울',
 '0432':'총신대입구(이수)',
 '2520':'신정(은행정)',
 '2522':'오목교(목동운동장앞)',
 '2545':'군자(능동)',
 '2546':'아차산(어린이대공원후문)',
 '2547':'광나루(장신대)',
 '2548':'천호(풍납토성)',
 '2551':'굽은다리(강동구민회관앞)',
 '2556':'올림픽공원(한국체대)',
 '2611':'응암순환(상선)',
 '2617':'새절(신사)',
 '2618':'증산(명지대앞)',
 '2620':'월드컵경기장(성산)',
 '2626':'대흥(서강대앞)',
 '2640':'안암(고대병원앞)',
 '2642':'월곡(동덕여대)',
 '2643':'상월곡(한국과학기술연구원)',
 '2647':'화랑대(서울여대입구)',
 '2718':'공릉(서울산업대입구)',
 '2727':'군자(능동)',
 '2728':'어린이대공원(세종대)',
 '2730':'뚝섬유원지',
 '2738':'총신대입구(이수)',
 '2740':'숭실대입구(살피재)',
 '2741':'상도(중앙대앞)',
 '2812':'천호(풍납토성)',
 '2814':'몽촌토성(평화의문)',
 '2823':'남한산성입구(성남법원,검찰청)',
};
const normalize=value=>String(value||'').normalize('NFC').replace(/\s/g,'');
const known=new Set([...registry.map(s=>normalize(s.ko)),...Object.values(apiNames).map(normalize)]);
for(const name of ['서울','총신대입구(이수)','이수','당고개'])known.add(normalize(name));
export function arrivalStationConfig(code){
 const s=getStationByCode(code);if(!s)return null;
 const apiName=apiNames[s.stationCode]||s.names.ko;
 const aliases=[apiName,s.names.ko,...s.aliases,...(s.names.ko==='불암산'?['당고개']:[])];
 return {station:{stationCode:s.stationCode,name:s.names.ko,lineId:s.subwayId,line:s.line+'호선',names:s.names},apiName,matchesStation:value=>aliases.some(a=>normalize(a)===normalize(value)),validDirectionName:value=>known.has(normalize(value)),line:s.line};
}
