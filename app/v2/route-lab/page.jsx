'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {getStationByCode,searchStationMaster} from '../../lib/station-master';
import {officialStationMatches,officialStationName} from '../../lib/officialStations';
import {stationName,lineName,directionName} from '../../lib/stationNameI18n';
import {preferredRouteOption} from '../../lib/route-compare';
import {splitPlaceStreamFrames,visiblePlaceDraft} from '../../lib/route-place-stream';
import './route-lab.css';

const COPY={
 ko:{title:'목적지 길찾기',subtitle:'지하철역부터 호텔·관광지까지, 목적지만 입력하세요.',lab:'V2 · NEW ROUTE LAB',origin:'출발역',change:'변경',chooseOrigin:'출발역 검색',dest:'어디로 가시나요?',placeholder:'역명, 호텔, 관광지, 건물명 또는 주소',search:'길찾기',searchPlace:'이 장소를 AI로 검색',searchingPlace:'장소 위치·추천 하차역 확인 중…',searchingRoute:'공식 지하철 경로 조회 중…',examples:'예시 목적지',suggest:'일치하는 지하철역',placeHint:'역명을 선택하면 공식 길찾기, 장소명은 AI 위치 검색',aiTitle:'AI 목적지 안내',recommend:'추천 하차역',why:'추천 이유',walk:'하차 후 이동',near:'확인된 하차역으로 공식 경로를 조회합니다.',sources:'위치 확인 출처',other:'다른 역으로 길찾기',official:'공식 지하철 경로 결과',duration:'소요시간',transfers:'환승',fare:'교통카드 운임',distance:'이동 거리',ride:'탑승',transfer:'환승',bound:'방면',stops:'정거장',allStops:'경유역 보기',path:'이동 경로',options:'경로 기준',modes:['최소시간','최단거리','최소환승'],retry:'다시 검색',unknown:'추천 하차역을 자동 연결하지 못했습니다. 위 AI 안내를 확인하거나 목적지 역을 직접 선택해 주세요.',sourceNote:'AI는 목적지에 적합한 하차역만 제안하며 실제 지하철 경로·운임은 공식 API로 조회합니다.',noData:'검색 결과가 없습니다.',invalid:'역을 찾지 못했어요.',fail:'검색에 실패했습니다.',apiOnly:'역 검색은 AI를 호출하지 않습니다.',testing:'독립 테스트 페이지 · 기존 V2 기능 변경 없음',same:'출발역과 도착역이 동일합니다. 하차 후 이동 경로를 확인하세요.',exitUnknown:'정확한 출구와 도보 경로가 확인되지 않으면 지도에서 최종 이동을 확인하세요.',minutes:'분',won:'원',count:'회',from:'출발',to:'하차',compare:'추천 하차역별 지하철 경로',bestSubway:'지하철 구간 기준 추천',chooseRoute:'이 경로 보기',compareFailed:'공식 경로 비교에 실패했습니다. 역을 직접 선택해 다시 검색해 주세요.',compareLoading:'추천역별 공식 지하철 경로 비교 중…',sameOrigin:'현재 출발역과 동일',unavailableRoute:'경로 조회 불가',compareNote:'지하철 이동만 비교한 결과입니다. 목적지까지 도보 이동과 출구는 포함되지 않습니다.',aiTime:'AI 응답',routeTime:'공식 경로'},
 en:{title:'Find your destination',subtitle:'A station, hotel, attraction or address — just enter where you want to go.',lab:'V2 · NEW ROUTE LAB',origin:'From station',change:'Change',chooseOrigin:'Find departure station',dest:'Where are you going?',placeholder:'Station, hotel, attraction, building or address',search:'Find route',searchPlace:'Search as a place with AI',searchingPlace:'Checking place and alighting station…',searchingRoute:'Checking the official subway route…',examples:'Try a destination',suggest:'Matching stations',placeHint:'Station → official route; other place → AI place lookup',aiTitle:'AI destination guide',recommend:'Suggested station',why:'Why this station?',walk:'After leaving the station',near:'Checking the official subway route to this station.',sources:'Location sources',other:'Choose a different station',official:'Official subway route',duration:'Travel time',transfers:'Transfers',fare:'Card fare',distance:'Distance',ride:'Ride',transfer:'Transfer',bound:'bound',stops:'stops',allStops:'Show intermediate stations',path:'Journey',options:'Route preference',modes:['Fastest','Shortest distance','Fewest transfers'],retry:'Search again',unknown:'A subway stop could not be linked automatically. Read the AI guidance above or choose a station directly.',sourceNote:'AI suggests the alighting station; subway route and fare come from the official API.',noData:'No matches found.',invalid:'Station not found.',fail:'Search failed.',apiOnly:'Station lookups do not call AI.',testing:'Standalone test · Existing V2 unchanged',same:'The destination is the departure station. Check the walk to your destination.',exitUnknown:'Check a map for exits and the last walking segment if not verified.',minutes:'min',won:'KRW',count:'',from:'From',to:'To',compare:'Subway routes to suggested stations',bestSubway:'Suggested for subway travel',chooseRoute:'View this route',compareFailed:'Could not compare official routes. Choose a station and try again.',compareLoading:'Comparing official subway routes…',sameOrigin:'Same as departure station',unavailableRoute:'Route unavailable',compareNote:'This compares subway journeys only, excluding walking and exits.',aiTime:'AI response',routeTime:'Official route'},
 ja:{title:'目的地への行き方',subtitle:'駅・ホテル・観光地・住所など、行き先を入力するだけ。',lab:'V2 · NEW ROUTE LAB',origin:'出発駅',change:'変更',chooseOrigin:'出発駅を検索',dest:'どちらへ行きますか？',placeholder:'駅名・ホテル・観光地・建物名・住所',search:'経路検索',searchPlace:'AIで場所を検索',searchingPlace:'目的地と降車駅を確認中…',searchingRoute:'公式地下鉄経路を検索中…',examples:'入力例',suggest:'駅の候補',placeHint:'駅名は公式経路、それ以外の場所はAI検索',aiTitle:'AI目的地案内',recommend:'おすすめ降車駅',why:'選んだ理由',walk:'駅から目的地まで',near:'おすすめ駅までの公式経路を検索します。',sources:'確認元',other:'別の駅を選ぶ',official:'公式地下鉄経路',duration:'所要時間',transfers:'乗換',fare:'交通カード運賃',distance:'移動距離',ride:'乗車',transfer:'乗換',bound:'方面',stops:'駅',allStops:'途中駅を見る',path:'乗車経路',options:'検索条件',modes:['最短時間','最短距離','最少乗換'],retry:'再検索',unknown:'おすすめ降車駅を自動連携できませんでした。上のAI案内を確認するか、駅を直接選択してください。',sourceNote:'AIは降車駅のみ提案します。地下鉄経路と運賃は公式APIを使用します。',noData:'候補がありません。',invalid:'駅が見つかりません。',fail:'検索に失敗しました。',apiOnly:'駅名検索ではAIを使いません。',testing:'独立テストページ · V2本体は変更なし',same:'出発駅と到着駅が同じです。徒歩移動をご確認ください。',exitUnknown:'出口や徒歩経路が未確認の場合は地図でご確認ください。',minutes:'分',won:'ウォン',count:'回',from:'出発',to:'到着',compare:'おすすめ降車駅の経路比較',bestSubway:'地下鉄区間のおすすめ',chooseRoute:'この経路を見る',compareFailed:'公式経路を比較できませんでした。駅を選んで再検索してください。',compareLoading:'公式地下鉄経路を比較中…',sameOrigin:'出発駅と同じ',unavailableRoute:'経路取得不可',compareNote:'地下鉄区間のみの比較です。徒歩や出口は含まれません。',aiTime:'AI応答',routeTime:'公式経路'},
 zh:{title:'前往目的地',subtitle:'车站、酒店、景点或地址，只需输入目的地。',lab:'V2 · NEW ROUTE LAB',origin:'出发站',change:'更改',chooseOrigin:'搜索出发站',dest:'您想去哪里？',placeholder:'车站、酒店、景点、建筑或地址',search:'查询路线',searchPlace:'使用AI搜索地点',searchingPlace:'正在确认地点及建议下车站…',searchingRoute:'正在查询官方地铁路线…',examples:'示例目的地',suggest:'匹配的车站',placeHint:'车站直接查询官方路线，其他地点由AI搜索',aiTitle:'AI目的地指南',recommend:'建议下车站',why:'推荐理由',walk:'出站后前往目的地',near:'正在查询前往建议车站的官方地铁路线。',sources:'地点来源',other:'选择其他车站',official:'官方地铁路线',duration:'预计时间',transfers:'换乘',fare:'交通卡票价',distance:'距离',ride:'乘车',transfer:'换乘',bound:'方向',stops:'站',allStops:'查看途经站',path:'行程',options:'路线偏好',modes:['时间最短','距离最短','换乘最少'],retry:'重新搜索',unknown:'未能自动关联建议下车站。请参考上方AI指南，或直接选择地铁站。',sourceNote:'AI仅建议下车站，地铁路线和票价由官方API查询。',noData:'没有匹配结果。',invalid:'找不到车站。',fail:'查询失败。',apiOnly:'车站搜索无需AI。',testing:'独立测试页面 · V2原功能未改动',same:'出发站和目的站相同，请确认步行路线。',exitUnknown:'未经核实的出口和步行路线请使用地图确认。',minutes:'分钟',won:'韩元',count:'次',from:'出发',to:'下车',compare:'建议下车站的地铁路线比较',bestSubway:'仅按地铁路程推荐',chooseRoute:'查看此路线',compareFailed:'无法比较官方路线，请选择车站重试。',compareLoading:'正在比较官方地铁路线…',sameOrigin:'与出发站相同',unavailableRoute:'路线不可用',compareNote:'仅比较地铁行程，不包含步行和出口。',aiTime:'AI响应',routeTime:'官方路线'}
};
const EXAMPLES=[{q:'강남역',type:'station'},{q:'롯데호텔 서울',type:'place'},{q:'경복궁 관광지',type:'place'},{q:'코엑스',type:'place'}];
const clean=x=>String(x||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s._·・･,，‘’'“”"\-‐–—:：()（）\[\]{}]/g,'');
const normalizeStation=x=>clean(x).replace(/역$/,'').replace(/station$/,'');
const colors={'1호선':'#24559b','2호선':'#219052','3호선':'#ef8928','4호선':'#238cc4','5호선':'#9256ab','6호선':'#a77935','7호선':'#687a32','8호선':'#d13e78','9호선':'#ae8c35'};
const lineColor=x=>colors[x]||'#536c80';
const secondsToMinutes=x=>Math.max(0,Math.round(Number(x||0)/60));
function StationIcon({line}){return <span className="rl-line" style={{background:lineColor(Number(line)+'호선')}}>{String(line).replace(/^0/,'')}</span>}
function LineBadge({line,lang}){return <span className="rl-route-line" style={{background:lineColor(line)}}>{lineName(line,lang)||line}</span>}
function stationLabel(s,lang){return s?.[lang]||s?.ko||'—';}
function buildRouteUrl(origin,destination,mode){
 const params=new URLSearchParams({station:origin,to:destination.ko,toCode:destination.code,mode});
 return '/api/subway-route?'+params;
}
/**
 * Show a progressively generated natural-language response; only the final
 * official station whitelist validation may trigger subway route requests.
 */
async function readRoutePlaceStream(response,signal,onDraft){
 if(!response.body)throw Error('AI_STREAM_UNAVAILABLE');
 const reader=response.body.getReader(),decoder=new TextDecoder();
 let buffer='',rawAnswer='',previousDraft='';
 function processFrame(frame){
  let packet;try{packet=JSON.parse(frame);}catch{throw Error('AI_STREAM_FORMAT_ERROR');}
  if(packet.kind==='error')throw Error(packet.error||'AI_UNAVAILABLE');
  if(packet.kind==='result')return packet.data;
  if(packet.kind==='delta'){
   rawAnswer+=String(packet.text||'');
   const visible=visiblePlaceDraft(rawAnswer);
   if(visible&&visible!==previousDraft&&!signal.aborted){
    previousDraft=visible;
    onDraft(visible);
   }
  }
  return null;
 }
 try{
  while(!signal.aborted){
   const {done,value}=await reader.read();
   if(done)break;
   buffer+=decoder.decode(value,{stream:true});
   const frames=splitPlaceStreamFrames(buffer);
   buffer=frames.remainder;
   for(const frame of frames.frames){
    const result=processFrame(frame);
    if(result)return result;
   }
  }
  throw Error('AI_STREAM_INTERRUPTED');
 }finally{reader.releaseLock();}
}

export default function UnifiedRouteLab(){
 const [lang,setLang]=useState('ko'),[originCode,setOriginCode]=useState('0154');
 const [originOpen,setOriginOpen]=useState(false),[originQuery,setOriginQuery]=useState('');
 const [query,setQuery]=useState(''),[picked,setPicked]=useState(null),[focused,setFocused]=useState(false);
 const [mode,setMode]=useState('duration'),[place,setPlace]=useState(null),[route,setRoute]=useState(null);
 const [routeOptions,setRouteOptions]=useState([]),[selectedRouteCode,setSelectedRouteCode]=useState(null);
 const [loading,setLoading]=useState(''),[error,setError]=useState('');
 const [timings,setTimings]=useState({aiMs:null,routes:{}});
 const requestRef=useRef(null),resultRef=useRef(null),manualRouteSelectionRef=useRef(false);
 const t=COPY[lang],origin=getStationByCode(originCode)||getStationByCode('0154');
 const stationMatches=useMemo(()=>{const q=query.trim();if(!q)return [];const first=officialStationMatches(q,lang,8);if(first.length)return first;const withoutSuffix=q.replace(/역$/,'').replace(/\s+station$/i,'');return withoutSuffix!==q?officialStationMatches(withoutSuffix,lang,8):[];},[query,lang]);
 const originMatches=useMemo(()=>searchStationMaster(originQuery,'',{initials:true}).slice(0,12),[originQuery]);
 useEffect(()=>{
  const p=new URLSearchParams(window.location.search);
  if(getStationByCode(p.get('station')))setOriginCode(p.get('station'));
  if(COPY[p.get('lang')])setLang(p.get('lang'));
 },[]);
 useEffect(()=>()=>requestRef.current?.abort(),[]);
 const setOrigin=station=>{
  requestRef.current?.abort();setLoading('');manualRouteSelectionRef.current=false;setTimings({aiMs:null,routes:{}});
  setOriginCode(station.stationCode);setOriginOpen(false);setOriginQuery('');setRoute(null);setRouteOptions([]);setSelectedRouteCode(null);setPlace(null);setError('');
  const u=new URL(window.location.href);u.searchParams.set('station',station.stationCode);window.history.replaceState(null,'',u.pathname+u.search);
 };
 const setLanguage=value=>{
  setLang(value);const u=new URL(window.location.href);u.searchParams.set('lang',value);
  window.history.replaceState(null,'',u.pathname+u.search);
 };
 const changeQuery=value=>{
  requestRef.current?.abort();setLoading('');manualRouteSelectionRef.current=false;setTimings({aiMs:null,routes:{}});setQuery(value);setPicked(null);setRoute(null);setRouteOptions([]);setSelectedRouteCode(null);setPlace(null);setError('');
 };
 const choose=st=>{
  requestRef.current?.abort();setLoading('');manualRouteSelectionRef.current=false;setTimings({aiMs:null,routes:{}});setQuery(st[lang]||st.ko);setPicked(st);setFocused(false);setRoute(null);setRouteOptions([]);setSelectedRouteCode(null);setPlace(null);setError('');
 };
 async function lookupRoute(station,signal){
  setLoading('route');setError('');setRoute(null);setRouteOptions([]);setSelectedRouteCode(null);
  if(normalizeStation(station.ko)===normalizeStation(origin.names.ko)){setError(t.same);setLoading('');return;}
  const response=await fetch(buildRouteUrl(originCode,station,mode),{cache:'no-store',signal});
  const result=await response.json();
  if(!response.ok||!result.ok||!result.route)throw Error(result.error||t.fail);
  if(result.route.originCode!==originCode)throw Error('ORIGIN_MISMATCH');
  if(!signal.aborted){setRoute(result.route);requestAnimationFrame(()=>resultRef.current?.scrollIntoView({block:'start',behavior:'smooth'}));}
 }
 async function compareOfficialRoutes(stations,signal,chosenMode=mode){
  setLoading('route');setError('');setRoute(null);setRouteOptions([]);setSelectedRouteCode(null);
  manualRouteSelectionRef.current=false;
  setTimings(previous=>({...previous,routes:{}}));
  // Each result is presented as soon as it finishes; a slow second station
  // cannot block the first official subway path from becoming visible.
  const checks=await Promise.all(stations.slice(0,2).map(async station=>{
   const routeStartedAt=performance.now();
   let option;
   if(normalizeStation(station.ko)===normalizeStation(origin.names.ko)){
    option={station,route:null,sameOrigin:true};
   }else{
    try{
     // A slow optional route must not monopolize the result screen.
     // A user-initiated cancellation always takes precedence.
     const routeSignal=typeof AbortSignal.any==='function'?
      AbortSignal.any([signal,AbortSignal.timeout(6000)]):signal;
     const response=await fetch(buildRouteUrl(originCode,station,chosenMode),{cache:'no-store',signal:routeSignal});
     const data=await response.json();
     if(!response.ok||!data.ok||!data.route)throw Error(data.error||'ROUTE_UNAVAILABLE');
     if(data.route.originCode!==originCode)throw Error('ORIGIN_MISMATCH');
     option={station,route:data.route};
    }catch(error){
     option={station,route:null,error:String(error.message||'ROUTE_UNAVAILABLE')};
    }
   }
   if(!signal.aborted){
    setRouteOptions(previous=>[...previous.filter(x=>x.station.code!==station.code),option]);
    setTimings(previous=>({...previous,routes:{...previous.routes,[station.code]:Math.round(performance.now()-routeStartedAt)}}));
    if(option.route&&!manualRouteSelectionRef.current){
     setRoute(current=>current||option.route);
     setSelectedRouteCode(current=>current??station.code);
    }
   }
   return option;
  }));
  if(signal.aborted)return;
  const preferred=preferredRouteOption(checks,chosenMode);
  if(preferred&&!manualRouteSelectionRef.current){
   setRoute(preferred.route);setSelectedRouteCode(preferred.station.code);
  }else if(!preferred)setError(t.compareFailed);
 }
 async function updateMode(value){
  if(value===mode||loading)return;
  setMode(value);setRoute(null);setRouteOptions([]);setSelectedRouteCode(null);setTimings(previous=>({...previous,routes:{}}));
  const candidates=place?.stations?.length?place.stations:place?.station?[place.station]:[];
  if(!candidates.length)return;
  requestRef.current?.abort();
  const ctrl=new AbortController();requestRef.current=ctrl;
  try{await compareOfficialRoutes(candidates,ctrl.signal,value);}
  catch(error){if(!ctrl.signal.aborted)setError(error.message||t.fail);}
  finally{if(requestRef.current===ctrl){requestRef.current=null;setLoading('');}}
 }
 function selectComparedRoute(option){
  if(!option?.route||loading==='place')return;
  manualRouteSelectionRef.current=true;
  setRoute(option.route);setSelectedRouteCode(option.station.code);
  requestAnimationFrame(()=>resultRef.current?.scrollIntoView({block:'start',behavior:'smooth'}));
 }
 async function perform(){
  const term=query.trim();
  if(!term||loading)return;
  requestRef.current?.abort();const ctrl=new AbortController();requestRef.current=ctrl;
  setFocused(false);setError('');setRoute(null);setRouteOptions([]);setSelectedRouteCode(null);setPlace(null);setTimings({aiMs:null,routes:{}});manualRouteSelectionRef.current=false;
  const exact=stationMatches.find(s=>[s.ko,s.en,s.ja,s.zh,s.ko+'역'].some(x=>normalizeStation(x)===normalizeStation(term)));
  try{
   if(picked||exact){
    await lookupRoute(picked||exact,ctrl.signal);
    return;
   }
   setLoading('place');
   const aiStartedAt=performance.now();
   const response=await fetch('/api/v2/route-place-test',{
    method:'POST',headers:{'Content-Type':'application/json',Accept:'text/event-stream'},
    body:JSON.stringify({query:term,lang,stationCode:originCode}),signal:ctrl.signal,cache:'no-store'
   });
   if(!response.ok){
    const failure=await response.json().catch(()=>({}));
    throw Error(failure.error||t.fail);
   }
   const result=response.headers.get('content-type')?.includes('text/event-stream')?
    await readRoutePlaceStream(response,ctrl.signal,answer=>setPlace({status:'loading',answer,place:term,sources:[]})):
    await response.json();
   if(!result.ok)throw Error(result.error||t.fail);
   if(ctrl.signal.aborted)return;
   // Display Gemini guidance immediately, before either subway route returns.
   setPlace(result);
   setTimings(previous=>({...previous,aiMs:Math.round(performance.now()-aiStartedAt)}));
   const candidates=Array.isArray(result.stations)&&result.stations.length?result.stations:result.station?[result.station]:[];
   if(result.status==='found'&&candidates.length){
    await compareOfficialRoutes(candidates,ctrl.signal);
   }
  }catch(error){if(!ctrl.signal.aborted)setError(error.message||t.fail);}
  finally{if(requestRef.current===ctrl){requestRef.current=null;setLoading('');}}
 }
 const routeStation=name=>officialStationName(name,lang,stationName);
 const fare=route?.fareWon==null?'—':Number(route.fareWon).toLocaleString('ko-KR')+' '+t.won;
 return <main className="route-lab" lang={lang==='zh'?'zh-CN':lang}>
  <div className="rl-shell">
   <header className="rl-top">
    <div className="rl-top-row"><span className="rl-lab-label"><span className="rl-pulse"/> {t.lab}</span>
     <select aria-label="Language" value={lang} onChange={e=>setLanguage(e.target.value)}><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option></select>
    </div>
    <div className="rl-title-icon">↗</div><h1>{t.title}</h1><p>{t.subtitle}</p>
   </header>
   <section className="rl-search-card">
    <div className="rl-field-head"><label>{t.origin}</label><button type="button" onClick={()=>setOriginOpen(v=>!v)}>{t.change} <span aria-hidden="true">⌄</span></button></div>
    <div className="rl-station-box"><StationIcon line={origin.line}/><strong>{origin.names[lang]}</strong><span className="rl-muted">{origin.line} {lang==='ko'?'호선':''}</span></div>
    {originOpen&&<div className="rl-origin-picker"><input aria-label={t.chooseOrigin} autoFocus placeholder={t.chooseOrigin} value={originQuery} onChange={e=>setOriginQuery(e.target.value)}/><div className="rl-origin-options">{originMatches.map(s=><button key={s.stationCode} type="button" onClick={()=>setOrigin(s)}><StationIcon line={s.line}/><span>{s.names[lang]}</span><small>{s.line}</small></button>)}</div></div>}
    <div className="rl-connection"><span/><span>↓</span><span/></div>
    <form onSubmit={e=>{e.preventDefault();void perform();}}>
     <label htmlFor="rl-destination">{t.dest}</label>
     <div className="rl-query-box"><span className="rl-search-icon">⌕</span><input id="rl-destination" value={query} onChange={e=>changeQuery(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),180)} placeholder={t.placeholder} maxLength={100} autoComplete="off"/>{query&&<button type="button" onClick={()=>changeQuery('')} aria-label="Clear">×</button>}</div>
     {focused&&!picked&&stationMatches.length>0&&<div className="rl-match-list" role="listbox" aria-label={t.suggest}><div className="rl-match-head">{t.suggest}</div>{stationMatches.slice(0,6).map(s=><button key={s.code} type="button" role="option" aria-selected="false" onMouseDown={e=>e.preventDefault()} onClick={()=>choose(s)}><span className="rl-match-icon">🚇</span><span><strong>{stationLabel(s,lang)}</strong><small>{s.lines?.join(' · ')||s.line}</small></span><span className="rl-match-arrow">↗</span></button>)}</div>}
     <p className="rl-field-note">{t.placeHint}</p>
     <div className="rl-route-options"><span>{t.options}</span><div role="group">{['duration','distance','transfer'].map((x,i)=><button type="button" key={x} aria-pressed={mode===x} disabled={!!loading} onClick={()=>{void updateMode(x);}}>{t.modes[i]}</button>)}</div></div>
     <button className="rl-submit" type="submit" disabled={!query.trim()||!!loading}>{loading==='place'?t.searchingPlace:loading==='route'?t.searchingRoute:<>{t.search}<span aria-hidden="true">→</span></>}</button>
     
    </form>
    <div className="rl-examples"><strong>{t.examples}</strong><div>{EXAMPLES.map(ex=><button key={ex.q} type="button" onClick={()=>{changeQuery(ex.q);setFocused(false);}}>{ex.q}</button>)}</div></div>
   </section>
   {(loading||error)&&<section className={'rl-alert'+(error?' rl-error':'')} role="status"><span>{loading==='place'?'✦':loading==='route'?'🚇':'ⓘ'}</span>{error|| (loading==='place'?t.searchingPlace:t.searchingRoute)}</section>}
   {place&&<section className="rl-result-card rl-place-card" aria-live="polite">
     <div className="rl-section-kicker">✦ GEMINI · GOOGLE SEARCH</div><h2>{t.aiTitle}</h2>
     {place.place&&<h3 className="rl-place-name">{place.place}</h3>}
     <p className="rl-ai-answer">{place.answer||t.unknown}</p>
     {timings.aiMs!==null&&<p className="rl-timing" aria-label="Query processing times"><span>{t.aiTime} {(timings.aiMs/1000).toFixed(1)}s</span>{Object.keys(timings.routes).length>0&&<span> · {t.routeTime} {(Math.max(...Object.values(timings.routes))/1000).toFixed(1)}s</span>}</p>}
     {place.status==='found'&&(place.stations?.length||place.station)?<>
       <div className="rl-recommend rl-compare">
        <div className="rl-compare-title"><strong>{t.compare}</strong>{loading==='route'&&<small>{t.compareLoading}</small>}</div>
        <div className="rl-compare-grid" role="group" aria-label={t.compare}>
         {(place.stations?.length?place.stations:[place.station]).slice(0,2).map(st=>{
          const option=routeOptions.find(x=>x.station.code===st.code);
          const preferred=preferredRouteOption(routeOptions,mode)?.station.code===st.code;
          const active=selectedRouteCode===st.code&&!!option?.route;
          return <button type="button" key={st.code} className={'rl-compare-option'+(active?' rl-compare-active':'')}
           aria-pressed={active} disabled={!option?.route||loading==='place'} onClick={()=>selectComparedRoute(option)}>
           <span className="rl-compare-stop"><span className="rl-match-icon">🚇</span><strong>{stationLabel(st,lang)}</strong></span>
           <small className="rl-compare-lines">{st.lines?.join(' · ')}</small>
           {preferred&&<span className="rl-best">{t.bestSubway}</span>}
           {option?.route?<span className="rl-compare-metrics"><b>{secondsToMinutes(option.route.totalSeconds)}{t.minutes}</b><span>{t.transfers} {option.route.transferCount}{t.count}</span></span>:
            <span className="rl-compare-pending">{option?.sameOrigin?t.sameOrigin:loading==='route'?t.compareLoading:t.unavailableRoute}</span>}
           <span className="rl-compare-action">{active?'✓ ':''}{t.chooseRoute} →</span>
          </button>;
         })}
        </div>
        <p className="rl-compare-note">{t.compareNote}</p>
       </div>
       {place.walk&&<p className="rl-last-mile"><strong>↗ {t.walk}</strong><span>{place.walk}</span></p>}
       <button className="rl-change-stop" type="button" onClick={()=>{changeQuery('');setFocused(true);document.getElementById('rl-destination')?.focus();}}>{t.other} →</button>
      </>:place.status==='loading'?null:<div className="rl-unverified">{t.unknown}</div>}
      {place.sources?.length>0&&<div className="rl-sources"><strong>{t.sources}</strong>{place.sources.map((s,i)=><a key={i} href={s.url} target="_blank" rel="noreferrer noopener">{s.title||'Source'} ↗</a>)}</div>}
   </section>}
   {route&&<section ref={resultRef} className="rl-result-card rl-route-card" aria-live="polite">
     <div className="rl-section-kicker">✦ OFFICIAL SUBWAY ROUTE API</div><h2>{t.official}</h2>
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
      <div className="rl-step" key={i}><span className="rl-step-pin" style={{background:lineColor(step.line)}}>{/^([1-9])호선$/.test(step.line)?step.line[0]:'🚇'}</span><div><strong>{routeStation(step.from)} → {routeStation(step.to)}</strong><p><LineBadge line={step.line} lang={lang}/> {step.direction&&<span>{directionName(step.direction,lang)||step.direction} {t.bound}</span>}</p>{step.segments>0&&<small>{step.segments} {t.stops}</small>}{step.stations?.length>2&&<details><summary>{t.allStops}</summary><div className="rl-stops">{step.stations.slice(1,-1).map((name,j)=><span key={j}>{routeStation(name)}</span>)}</div></details>}</div></div>
     )}</div>
     {place&&<p className="rl-route-note">{t.exitUnknown}</p>}
    </section>}
   <footer className="rl-footer"><p>{t.sourceNote}</p><p>{t.testing}</p></footer>
  </div>
 </main>;
}
