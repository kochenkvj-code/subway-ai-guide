// Reuse the display conventions of the home-screen TrainSummary:
// a documented terminus takes priority; Line 2 circle trains add the
// verified inner/outer loop direction rather than inventing a station.
const BRANCH_STATIONS=new Set([
 '용답','신답','용두','신설동','도림천','양천구청','신정네거리','까치산'
]);
const JUNCTION_STATIONS=new Set(['성수','신도림']);
const UNKNOWN={ko:'행선 미확인',en:'Destination unknown',ja:'行先未確認',zh:'终点未确认'};
const LOOP={
 '0':{ko:'내선순환',en:'Inner loop',ja:'内回り',zh:'内环'},
 '1':{ko:'외선순환',en:'Outer loop',ja:'外回り',zh:'外环'}
};
const LOOP_SUFFIX={
 '0':{ko:'(내선)행',en:' (Inner)',ja:'(内回り)行',zh:'(内环)方向'},
 '1':{ko:'(외선)행',en:' (Outer)',ja:'(外回り)行',zh:'(外环)方向'}
};
export function trainLostDestination({line,raw,direction,station,lang='ko'},translate){
 const original=String(raw??'').trim();
 // Seoul API may return '성수(내선)', '성수순환', or a direction-only label.
 const stationPart=original.replace(/\s*[（(]\s*(?:내선|외선|순환|종착역?)\s*[)）]\s*$/,'')
  .replace(/\s*(?:내선|외선)순환\s*$/,'')
  .replace(/\s*(?:종착역?|방면|행)\s*$/,'')
  .replace(/순환$/,'').trim();
 const isMain=Number(line)===2 &&
  !BRANCH_STATIONS.has(String(station??'').trim().replace(/역$/,'')) &&
  !JUNCTION_STATIONS.has(String(station??'').trim().replace(/역$/,''));
 const dir=String(direction);
 const documented=stationPart && !/^(내선|외선)$/.test(stationPart) && typeof translate==='function'
   ?translate(stationPart):'';
 if(documented && !['Station name unavailable','駅名未登録','暂无车站译名'].includes(documented)){
  if(isMain && stationPart==='성수' && LOOP_SUFFIX[dir]){
   return {kind:'terminus',value:documented,text:documented+LOOP_SUFFIX[dir][lang]};
  }
  return {kind:'terminus',value:documented,
   text:lang==='en'?'To '+documented:documented+(lang==='ko'?'행':lang==='ja'?'行':'方向')};
 }
 if(isMain && LOOP[dir]){
  return {kind:'loop',value:LOOP[dir][lang],text:LOOP[dir][lang]};
 }
 return {kind:'unknown',value:null,text:UNKNOWN[lang]||UNKNOWN.ko};
}
