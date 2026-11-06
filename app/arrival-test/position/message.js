// Compact position relative to the selected station, never an ETA.
export function positionMessage({row,stops},lang='ko'){
 const state=String(row.trainSttus??'');
 const distance=stops===0&&state==='3'?1:stops;
 if(distance>0)return ({ko:`${distance}역 전`,en:`${distance} stops`,ja:`${distance}駅前`,zh:`前方${distance}站`})[lang];
 if(state==='0')return {ko:'진입',en:'Arriving',ja:'進入中',zh:'进站中'}[lang];
 if(state==='1')return {ko:'도착',en:'Arrived',ja:'到着',zh:'已到站'}[lang];
 return String(row.trainSttus??'—');
}
