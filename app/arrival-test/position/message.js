// Compact position relative to the selected station, never an ETA.
export function positionMessage({row,stops},lang='ko'){
 const state=String(row.trainSttus??'');
 if(stops>0)return ({ko:`${stops} 정거장`,en:`${stops} ${stops===1?'stop':'stops'}`,ja:`${stops}駅前`,zh:`前方${stops}站`})[lang];
 const labels={
  '0':{ko:'진입',en:'Arriving',ja:'進入中',zh:'进站中'},
  '1':{ko:'도착',en:'Arrived',ja:'到着',zh:'已到站'},
  '3':{ko:'전역 출발',en:'Prev. left',ja:'前駅発',zh:'前站发车'}
 };
 // 2 (departure) is removed by positionGroups at the selected station.
 // Never expose unrecognized provider codes as bare numbers.
 return labels[state]?.[lang]||'—';
}
