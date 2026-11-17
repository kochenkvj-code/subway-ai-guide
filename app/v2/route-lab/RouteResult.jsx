import {officialStationMatches,officialStationName} from '../../lib/officialStations';
import {stationName,lineName,directionName} from '../../lib/stationNameI18n';
import {buildRouteStationTimeline} from '../../lib/route-station-timeline';
const COPY={
 ko:{walkingTitle:'하차 후 도보안내',walkingUnknown:'정확한 출구·도보 안내가 확인되지 않았습니다. 지도에서 확인해 주세요.',mapGoogle:'구글맵에서 위치 보기',title:'목적지 길찾기',subtitle:'지하철역부터 호텔·관광지까지, 목적지만 입력하세요.',lab:'V2 · NEW ROUTE LAB',origin:'출발역',change:'변경',chooseOrigin:'출발역 검색',dest:'어디로 가시나요?',placeholder:'역명, 호텔, 관광지, 건물명 또는 주소',search:'길찾기',searchPlace:'이 장소를 AI로 검색',searchingPlace:'장소 위치·추천 하차역 확인 중…',searchingRoute:'공식 지하철 경로 조회 중…',examples:'예시 목적지',suggest:'일치하는 지하철역',placeHint:'역명을 선택하면 공식 길찾기, 장소명은 AI 위치 검색',aiTitle:'AI 목적지 안내',recommend:'추천 하차역',why:'추천 이유',walk:'하차 후 이동',near:'확인된 하차역으로 공식 경로를 조회합니다.',sources:'위치 확인 출처',other:'다른 역으로 길찾기',official:'공식 지하철 경로 결과',duration:'소요시간',transfers:'환승',fare:'교통카드 운임',distance:'이동 거리',ride:'탑승',transfer:'환승',bound:'방면',stops:'정거장',allStops:'경유역 보기',allStations:'경유역 전체보기',path:'이동 경로',options:'경로 기준',modes:['최소시간','최단거리','최소환승'],retry:'다시 검색',unknown:'추천 하차역을 자동 연결하지 못했습니다. 위 AI 안내를 확인하거나 목적지 역을 직접 선택해 주세요.',sourceNote:'AI는 목적지에 적합한 하차역만 제안하며 실제 지하철 경로·운임은 공식 API로 조회합니다.',noData:'검색 결과가 없습니다.',invalid:'역을 찾지 못했어요.',fail:'검색에 실패했습니다.',apiOnly:'역 검색은 AI를 호출하지 않습니다.',testing:'독립 테스트 페이지 · 기존 V2 기능 변경 없음',same:'출발역과 도착역이 동일합니다. 하차 후 이동 경로를 확인하세요.',exitUnknown:'정확한 출구와 도보 경로가 확인되지 않으면 지도에서 최종 이동을 확인하세요.',minutes:'분',won:'원',count:'회',from:'출발',to:'하차'},
 en:{walkingTitle:'Walk to your destination',walkingUnknown:'No confirmed exit or walking instructions. Please check the map.',mapGoogle:'See location on Google Maps',title:'Find your destination',subtitle:'Enter a station, hotel or attraction to find your route.',lab:'V2 · NEW ROUTE LAB',origin:'From station',change:'Change',chooseOrigin:'Find departure station',dest:'Where are you going?',placeholder:'Station, place or address',search:'Find route',searchPlace:'Search as a place with AI',searchingPlace:'Finding your destination…',searchingRoute:'Finding your route…',examples:'Try a destination',suggest:'Matching stations',placeHint:'Station → official route; other place → AI place lookup',aiTitle:'AI destination guide',recommend:'Suggested station',why:'Why this station?',walk:'After leaving the station',near:'Checking the official subway route to this station.',sources:'Location sources',other:'Choose a different station',official:'Official subway route',duration:'Travel time',transfers:'Transfers',fare:'Card fare',distance:'Distance',ride:'Ride',transfer:'Transfer',bound:'bound',stops:'stops',allStops:'Show intermediate stations',allStations:'Show all stations',path:'Journey',options:'Route preference',modes:['Fastest','Shortest distance','Fewest transfers'],retry:'Search again',unknown:'A subway stop could not be linked automatically. Read the AI guidance above or choose a station directly.',sourceNote:'AI suggests the alighting station; subway route and fare come from the official API.',noData:'No matches found.',invalid:'Station not found.',fail:'Search failed.',apiOnly:'Station lookups do not call AI.',testing:'Standalone test · Existing V2 unchanged',same:'The destination is the departure station. Check the walk to your destination.',exitUnknown:'Check a map for exits and the last walking segment if not verified.',minutes:'min',won:'KRW',count:'',from:'From',to:'To'},
 ja:{walkingTitle:'下車後の徒歩案内',walkingUnknown:'出口や徒歩経路は確認できませんでした。地図でご確認ください。',mapGoogle:'Google マップで場所を確認',title:'目的地への行き方',subtitle:'駅・ホテル・観光地・住所など、行き先を入力するだけ。',lab:'V2 · NEW ROUTE LAB',origin:'出発駅',change:'変更',chooseOrigin:'出発駅を検索',dest:'どちらへ行きますか？',placeholder:'駅名・ホテル・観光地・建物名・住所',search:'経路検索',searchPlace:'AIで場所を検索',searchingPlace:'目的地と降車駅を確認中…',searchingRoute:'公式地下鉄経路を検索中…',examples:'入力例',suggest:'駅の候補',placeHint:'駅名は公式経路、それ以外の場所はAI検索',aiTitle:'AI目的地案内',recommend:'おすすめ降車駅',why:'選んだ理由',walk:'駅から目的地まで',near:'おすすめ駅までの公式経路を検索します。',sources:'確認元',other:'別の駅を選ぶ',official:'公式地下鉄経路',duration:'所要時間',transfers:'乗換',fare:'交通カード運賃',distance:'移動距離',ride:'乗車',transfer:'乗換',bound:'方面',stops:'駅',allStops:'途中駅を見る',allStations:'全経由駅を見る',path:'乗車経路',options:'検索条件',modes:['最短時間','最短距離','最少乗換'],retry:'再検索',unknown:'おすすめ降車駅を自動連携できませんでした。上のAI案内を確認するか、駅を直接選択してください。',sourceNote:'AIは降車駅のみ提案します。地下鉄経路と運賃は公式APIを使用します。',noData:'候補がありません。',invalid:'駅が見つかりません。',fail:'検索に失敗しました。',apiOnly:'駅名検索ではAIを使いません。',testing:'独立テストページ · V2本体は変更なし',same:'出発駅と到着駅が同じです。徒歩移動をご確認ください。',exitUnknown:'出口や徒歩経路が未確認の場合は地図でご確認ください。',minutes:'分',won:'ウォン',count:'回',from:'出発',to:'到着'},
 zh:{walkingTitle:'下车后步行指南',walkingUnknown:'未能确认出口或步行路线，请查看地图。',mapGoogle:'在 Google 地图查看位置',title:'前往目的地',subtitle:'车站、酒店、景点或地址，只需输入目的地。',lab:'V2 · NEW ROUTE LAB',origin:'出发站',change:'更改',chooseOrigin:'搜索出发站',dest:'您想去哪里？',placeholder:'车站、酒店、景点、建筑或地址',search:'查询路线',searchPlace:'使用AI搜索地点',searchingPlace:'正在确认地点及建议下车站…',searchingRoute:'正在查询官方地铁路线…',examples:'示例目的地',suggest:'匹配的车站',placeHint:'车站直接查询官方路线，其他地点由AI搜索',aiTitle:'AI目的地指南',recommend:'建议下车站',why:'推荐理由',walk:'出站后前往目的地',near:'正在查询前往建议车站的官方地铁路线。',sources:'地点来源',other:'选择其他车站',official:'官方地铁路线',duration:'预计时间',transfers:'换乘',fare:'交通卡票价',distance:'距离',ride:'乘车',transfer:'换乘',bound:'方向',stops:'站',allStops:'查看途经站',allStations:'查看全部途经站',path:'行程',options:'路线偏好',modes:['时间最短','距离最短','换乘最少'],retry:'重新搜索',unknown:'未能自动关联建议下车站。请参考上方AI指南，或直接选择地铁站。',sourceNote:'AI仅建议下车站，地铁路线和票价由官方API查询。',noData:'没有匹配结果。',invalid:'找不到车站。',fail:'查询失败。',apiOnly:'车站搜索无需AI。',testing:'独立测试页面 · V2原功能未改动',same:'出发站和目的站相同，请确认步行路线。',exitUnknown:'未经核实的出口和步行路线请使用地图确认。',minutes:'分钟',won:'韩元',count:'次',from:'出发',to:'下车'}
};
const EXAMPLES=[
 {ko:'강남역',en:'Gangnam',ja:'カンナム',zh:'江南',type:'station'},
 {ko:'롯데호텔 서울',en:'Lotte Hotel Seoul',ja:'ロッテホテルソウル',zh:'首尔乐天酒店',type:'place'},
 {ko:'경복궁 관광지',en:'Gyeongbokgung Palace',ja:'景福宮 観光地',zh:'景福宫 景点',type:'place'},
 {ko:'코엑스',en:'COEX Mall',ja:'COEXモール',zh:'COEX商场',type:'place'}
];
const RESULT_ACTIONS={
 ko:{again:'다른 목적지 검색',yes:'해결됨',no:'해결 안 됨',thanks:'피드백 감사합니다.',label:'이 안내로 해결됐나요?'},
 en:{again:'Search another destination',yes:'Solved',no:'Not solved',thanks:'Thanks for your feedback.',label:'Did this solve it?'},
 ja:{again:'別の目的地を検索',yes:'解決した',no:'解決しない',thanks:'ご協力ありがとうございます。',label:'解決しましたか？'},
 zh:{again:'搜索其他目的地',yes:'已解决',no:'未解决',thanks:'感谢您的反馈。',label:'问题解决了吗？'}
};
const clean=x=>String(x||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s._·・･,，‘’'“”"\-‐–—:：()（）\[\]{}]/g,'');
const normalizeStation=x=>clean(x).replace(/역$/,'').replace(/station$/,'');
const colors={'1호선':'#24559b','2호선':'#219052','3호선':'#ef8928','4호선':'#238cc4','5호선':'#9256ab','6호선':'#a77935','7호선':'#687a32','8호선':'#d13e78','9호선':'#ae8c35'};
const normalizeLine=x=>String(x||'').replace(/^0([1-9])호선$/,'$1호선');
const lineColor=x=>colors[normalizeLine(x)]||'#536c80';
const secondsToMinutes=x=>Math.max(0,Math.round(Number(x||0)/60));
function StationIcon({line}){return <span className="rl-line" style={{background:lineColor(Number(line)+'호선')}}>{String(line).replace(/^0/,'')}</span>}
function LineBadge({line,lang,compact=false}){const normalized=normalizeLine(line),label=lineName(normalized,lang)||normalized,short=normalized.match(/^([1-9])호선$/);return <span className={'rl-route-line'+(compact?' rl-line-short':'')} style={{background:lineColor(line)}} title={label} aria-label={label}>{compact&&short?short[1]:label}</span>}
function stationLabel(s,lang){return s?.[lang]||s?.ko||'—';}
function renderRouteAnswer(value){
 return String(value||'').split(/(\*\*[\s\S]*?\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')&&part.length>4
  ?<strong key={i}>{part.slice(2,-2).replace(/\*\*/g,'')}</strong>:part.replace(/\*\*/g,''));
}
function buildRouteUrl(origin,destination,mode){
 const params=new URLSearchParams({station:origin,to:destination.ko,toCode:destination.code,mode});
 return '/api/subway-route?'+params;
}
function matchesForQuery(query,lang){const q=query.trim();if(!q)return [];const first=officialStationMatches(q,lang,8);if(first.length)return first;const withoutSuffix=q.replace(/역$/,'').replace(/\s+station$/i,'');return withoutSuffix!==q?officialStationMatches(withoutSuffix,lang,8):[];}

export {COPY,EXAMPLES,RESULT_ACTIONS,normalizeStation,lineColor,normalizeLine,lineName,stationLabel,matchesForQuery,buildRouteUrl};
export default function RouteResult({place,route,lang,query='',placeRef=null,resultRef=null}){
const t=COPY[lang]||COPY.en;const routeStation=name=>officialStationName(name,lang,stationName);const fare=route?.fareWon==null?'—':Number(route.fareWon).toLocaleString('ko-KR')+' '+t.won;const allRouteStops=buildRouteStationTimeline(route);
return <div lang={lang==='zh'?'zh-CN':lang}>
   {place&&<section ref={placeRef} className="rl-result-card rl-place-card" aria-live="polite">
     <h2>{t.aiTitle}</h2>
     {place.place&&<h3 className="rl-place-name">{place.place}</h3>}
     <p className="rl-ai-answer">{renderRouteAnswer(place.answer||t.unknown)}</p>
     
     {place.status==='found'&&place.station?<><div className="rl-recommend"><small>{t.recommend}</small><div className="rl-recommend-station">{place.station.lines?.map(line=><LineBadge key={line} line={line} lang={lang} compact/>)}<strong>{stationLabel(place.station,lang)}</strong></div>{place.reason&&<p>{place.reason}</p>}</div>
       
     </>:<div className="rl-unverified">{t.unknown}</div>}
 
   </section>}
   {route&&<section ref={resultRef} className="rl-result-card rl-route-card" aria-live="polite">
     <h2>{t.official}</h2>
     <div className="rl-route-head"><div><small>{t.from}</small><strong>{routeStation(route.origin)}</strong></div><span>→</span><div><small>{t.to}</small><strong>{routeStation(route.destination)}</strong></div></div>
     <div className="rl-stats">
      <div><small>{t.duration}</small><strong>{secondsToMinutes(route.totalSeconds)}{t.minutes}</strong></div>
      <div><small>{t.transfers}</small><strong>{route.transferCount} {t.count}</strong></div>
      <div><small>{t.fare}</small><strong>{fare}</strong></div>
      <div><small>{t.distance}</small><strong>{Number.isFinite(Number(route.totalMeters))?(Number(route.totalMeters)/1000).toFixed(1)+' km':'—'}</strong></div>
     </div>
     <h3 className="rl-path-title">{t.path}</h3>
     <div className="rl-steps">{(route.itinerary||[]).map((step,i)=>step.type==='transfer'?
      <div className="rl-step rl-transfer" key={i}><span className="rl-step-pin">⇄</span><div><strong>{routeStation(step.station)} · {t.transfer}</strong><p><LineBadge line={step.fromLine} lang={lang}/> <span>→</span> <LineBadge line={step.toLine} lang={lang}/></p></div></div>:
      <div className="rl-step" key={i}><span className="rl-step-pin" style={{background:lineColor(step.line)}}>{/^([1-9])호선$/.test(step.line)?step.line[0]:'🚇'}</span><div><strong>{routeStation(step.from)} → {routeStation(step.to)}</strong><p><LineBadge line={step.line} lang={lang}/> {step.direction&&<span>{directionName(step.direction,lang)||step.direction} {t.bound}</span>}</p>{step.segments>0&&<small>{step.segments} {t.stops}</small>}{step.stations?.length>2&&<details><summary>{t.allStops}</summary><div className="rl-stops" style={{'--rl-stop-line':lineColor(step.line)}}>{step.stations.slice(1,-1).map((name,j)=><span key={j}>{routeStation(name)}</span>)}</div></details>}</div></div>
     )}</div>

     {allRouteStops.length>0&&<details className="rl-all-stations">
       <summary><span className="rl-all-stations-title">{t.allStations} <small>({allRouteStops.length})</small></span><svg className="rl-all-stations-chevron" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></summary>
       <div className="rl-all-stations-list" role="list" aria-label={t.allStations}>
        {allRouteStops.map((stop,i)=><span className={'rl-all-stop'+(stop.transfer?' rl-all-transfer':'')+(stop.start?' rl-all-start':'')+(stop.end?' rl-all-end':'')} role="listitem" key={i}>
         <span className="rl-all-stop-chip">
          {(stop.start||stop.end||stop.transfer)&&stop.lines.length>0&&<span className="rl-all-stop-lines">{stop.lines.map(line=><LineBadge key={line} line={line} lang={lang} compact/>)}</span>}
          <span className="rl-all-stop-name">{routeStation(stop.name)}</span>
          {stop.transfer&&<span className="rl-all-transfer-label">{t.transfer}</span>}
         </span>
         {i<allRouteStops.length-1&&<span className="rl-all-stop-arrow" aria-hidden="true">→</span>}
        </span>)}
       </div>
     </details>}
     
    </section>}
   {place?.status==='found'&&place.station&&<section className="rl-result-card rl-walk-guide" aria-live="polite">
     
     <h2>{t.walkingTitle}</h2>
     <div className="rl-walk-places"><span>{stationLabel(place.station,lang)}</span><span aria-hidden="true">→</span><strong>{place.place||query.trim()}</strong></div>
     <p className="rl-walk-summary">{renderRouteAnswer(place.walk||t.walkingUnknown)}</p>
     <div className="rl-walk-actions">
       <a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.mapQuery||place.place||query.trim())} target="_blank" rel="noopener noreferrer">⌖ {t.mapGoogle} ↗</a>
     </div>
   </section>}

</div>;
}
