import {copy,menuItems} from './copy';
export function recommendationLabel(id,lang,station=null){
 const t=copy[lang]||copy.ko;
 if(station&&['facility','tour','timetable','live','found','feedback'].includes(id)){
  const name=station.names[lang]||station.names.ko;
  const ko=name.endsWith('역')?name:name+'역';
  const labels={ko:{facility:`${ko} 시설 보기`,tour:`${ko} 주변 관광지 보기`,timetable:`${ko} 시간표 보기`,live:`${ko} 실시간 도착정보 보기`,found:`${ko} 습득물 검색`,feedback:`${ko} 개선 의견`},en:{facility:`${name} facilities`,tour:`Attractions near ${name}`,timetable:`${name} timetable`,live:`${name} live arrivals`,found:`Found items at ${name}`,feedback:`${name} feedback`},ja:{facility:`${name}の設備`,tour:`${name}周辺の観光`,timetable:`${name}の時刻表`,live:`${name}の列車到着`,found:`${name}の拾得物`,feedback:`${name}へのご意見`},zh:{facility:`${name}设施`,tour:`${name}周边景点`,timetable:`${name}时刻表`,live:`${name}实时到站`,found:`${name}拾得物查询`,feedback:`${name}改善建议`}};
  return (labels[lang]||labels.ko)[id];
 }
 const label=id==='live'?t.liveTitle:t.menu[menuItems.findIndex(item=>item.id===id)];
 return ({ko:`${label} 보기`,en:`Open ${label}`,ja:`${label}を見る`,zh:`查看${label}`})[lang]||label;
}

export function routeRecommendationLabel(query,lang='ko'){
 return ({ko:`${query} 길찾기`,en:`Directions to ${query}`,ja:`${query}への行き方`,zh:`前往${query}的路线`})[lang]||`${query} 길찾기`;
}

export function routeRecommendationOrigin(station,lang='ko'){
 const name=station.names[lang]||station.names.ko;
 return ({ko:`${name} 출발`,en:`From ${name}`,ja:`${name}から出発`,zh:`从${name}出发`})[lang]||name;
}
