import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {buildV2Prompt} from '../app/lib/v2-chat-policy.js';
import {buildRoutePlacePrompt} from '../app/lib/route-place-prompt.js';
import {buildRouteStationTimeline} from '../app/lib/route-station-timeline.js';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const official=JSON.parse(await read('app/data/seoulMetroOfficialStations.json'));
const source=await read('app/lib/route-place-policy.js');
const context=vm.createContext({Map,Set,RegExp,String,Object,Array});
const policy=new vm.SourceTextModule(source,{context});
await policy.link(async name=>{
 assert.equal(name,'../data/seoulMetroOfficialStations.json');
 return new vm.SyntheticModule(['default'],function(){this.setExport('default',official);},{context});
});
await policy.evaluate();
const {parsePlaceAnswer,resolveOfficialStop}=policy.namespace;
const reply=(station='삼성역')=>`코엑스몰은 2호선 삼성역이나 9호선 봉은사역에서 갈 수 있습니다. 공식 경로는 별도로 확인해 주세요.
<route_station>${station}</route_station>
<menu_recommendation>route</menu_recommendation>`;
const page=await read('app/v2/route-lab/RouteLab.jsx');
const standalone=await read('app/v2/route-lab/page.jsx');
const v2=await read('app/v2/V2Guide.jsx');
const api=await read('app/api/v2/route-place-test/route.js');
const css=await read('app/v2/route-lab/route-lab.css');

test('wayfinding has a dedicated compact prompt; existing V2 facility chat is unchanged',()=>{
 const station={stationCode:'0154',line:'1',names:{ko:'종로5가'}};
 const chat=buildV2Prompt('코엑스','ko',station,'Korean language rule');
 const routed=buildRoutePlacePrompt('코엑스','ko',station,'Korean language rule');
 assert.ok(chat.includes('LINE-SPECIFIC STATION IDENTITY'));
 assert.ok(chat.includes('SEARCH COVERAGE'));
 assert.ok(chat.includes('OPTIONAL MENU RECOMMENDATION'));
 assert.match(routed,/Google Search grounding/);
 assert.match(routed,/Destination requested by the passenger: "코엑스"/);
 assert.match(routed,/Departure station.*1호선 종로5가역/);
 assert.match(routed,/Korean language rule/);
 assert.match(routed,/<route_station>official Korean subway station name<\/route_station>/);
 assert.match(routed,/<menu_recommendation>route<\/menu_recommendation>/);
 for(const forbidden of ['QR entry station','LINE-SPECIFIC STATION IDENTITY','SEARCH COVERAGE',
  'station facilities','connected arcades','facility ownership','not verified inside',
  'inside the station','connected underground arcade']){
  assert.equal(routed.includes(forbidden),false,'unrelated station facility policy: '+forbidden);
 }
 assert.ok(routed.length<chat.length/2,'dedicated prompt should be shorter');
 assert.equal(buildV2Prompt('코엑스','ko',station,'Korean language rule'),chat);
});

test('official station whitelist validates named stops without trusting model-made codes',()=>{
 const gangnam=resolveOfficialStop('강남역');
 assert.ok(gangnam&&gangnam.code);
 assert.equal(gangnam.ko,'강남');
 assert.equal(resolveOfficialStop('0000'),null);
 assert.equal(resolveOfficialStop('가짜신도시'),null);
 assert.equal(resolveOfficialStop('강남 2호선'),null);
});

test('natural prose and valid trailing optional station metadata return a route',()=>{
 const result=parsePlaceAnswer(reply());
 assert.equal(result.status,'found');
 assert.equal(result.station.ko,'삼성');
 assert.ok(result.station.code);
 assert.equal(result.recommendedMenu,'route');
 assert.match(result.answer,/코엑스몰/);
 assert.match(result.answer,/봉은사역/);
 assert.doesNotMatch(result.answer,/route_station|menu_recommendation/);
 const oneTag=parsePlaceAnswer('서울역을 이용할 수 있습니다.\n<route_station>서울역</route_station>');
 assert.equal(oneTag.status,'found');
 assert.equal(oneTag.station.ko,'서울역');
});

test('freeform answer survives absent tags, invalid station, ambiguous answer, or truncation',()=>{
 for(const text of [
  '2호선 삼성역 또는 9호선 봉은사역에서 갈 수 있습니다.',
  '<menu_recommendation>none</menu_recommendation>\n',
  '안내입니다.\n<route_station>가짜신도시</route_station>\n<menu_recommendation>route</menu_recommendation>',
  '안내입니다.\n<route_station>삼성역</route_station>\n<menu_recommendation>none</menu_recommendation>',
  '안내입니다.\n<route_station>삼성역</route_station>\n추가 설명',
  '안내입니다.\n<route_station>삼성역</route_station>\n<route_station>봉은사역</route_station>\n<menu_recommendation>route</menu_recommendation>',
  '안내입니다.\n<route_station>삼성역</route_station>\n<menu_recommendation>bad</menu_recommendation>'
 ]){
  const parsed=parsePlaceAnswer(text,true);
  assert.equal(parsed.station,null,text);
  assert.equal(parsed.status,'unverified',text);
 }
 assert.equal(parsePlaceAnswer(reply(),false).station,null);
 const noMeta=parsePlaceAnswer('스타필드 코엑스몰은 삼성역과 봉은사역에서 접근할 수 있습니다.');
 assert.match(noMeta.answer,/삼성역과 봉은사역/);
 assert.equal(noMeta.station,null);
 assert.equal(parsePlaceAnswer('Example: `<route_station>삼성</route_station>`').station,null);
});

test('station and place inputs route through existing official API, with AI answer retained',()=>{
 assert.match(page,/officialStationMatches/);
 assert.match(page,/searchStationMaster/);
 assert.match(page,/\/api\/v2\/route-place-test/);
 assert.match(page,/\/api\/subway-route\?/);
 assert.match(page,/toCode:destination\.code/);
 assert.match(page,/setPlace\(result\)/);
 assert.match(page,/result\.status==='found'/);
 assert.match(page,/lookupRoute\(result\.station,ctrl\.signal,result,term\)/);
 assert.match(page,/\['duration','distance','transfer'\]/);
 assert.match(page,/aiTitle:'AI 목적지 안내'/);
 assert.match(css,/max-width:490px/);
});

test('route API uses dedicated wayfinding prompt and preserves model settings',()=>{
 assert.match(api,/buildRoutePlacePrompt\(query,lang,station,languageOutputRule\(lang\)\)/);
 assert.match(api,/route-place-prompt/);
 assert.doesNotMatch(api,/buildV2Prompt|buildV2RoutePrompt/);
 assert.match(api,/tools:\[\{googleSearch:\{\}\}\]/);
 assert.match(api,/maxOutputTokens:1200/);
 assert.match(api,/thinkingLevel:'LOW'/);
 assert.match(api,/parsePlaceAnswer\(text,complete\)/);
 assert.match(api,/getStationByCode\(body\.stationCode\)/);
 assert.doesNotMatch(api,/if\(!sources\.length&&parsed\.status==='found'/);
 assert.match(api,/request\.headers\.get\('origin'\)/);
 assert.match(api,/getVercelOidcToken\(\)/);
});

test('route button receives exactly one official station and no two-stop UI',()=>{
 const prompt=buildRoutePlacePrompt('국립고궁박물관','ko',{stationCode:'0154',line:'1',names:{ko:'종로5가'}},'Korean');
 assert.match(prompt,/SEOUL SUBWAY DESTINATION WAYFINDING/);
 assert.doesNotMatch(prompt,/FAST PRIMARY RECOMMENDATION|Do NOT perform additional Google searches|SECOND station|two alternative stations|optimal route/);
 assert.match(prompt,/<route_station>official Korean subway station name<\/route_station>/);
 assert.match(page,/lookupRoute\(result\.station,ctrl\.signal,result,term\)/);
 assert.doesNotMatch(page,/compareOfficialRoutes|preferredRouteOption|Promise\.all\(stations\.slice|AbortSignal\.timeout\(6000\)/);
 assert.doesNotMatch(page,/aiMs\/1000/);
});
test('museum answer with a standalone final subway station connects one official stop',()=>{
 const answer='국립고궁박물관은 서울특별시 종로구 효자로에 위치한 박물관입니다. 지하철을 이용하실 경우 **3호선 경복궁역** 5번 출구가 박물관 바로 인접해 있어 편리합니다. 또한 5호선 광화문역을 통해서도 도보 접근이 가능합니다.\n\n경복궁역';
 const result=parsePlaceAnswer(answer);
 assert.equal(result.status,'found');
 assert.equal(result.station.ko,'경복궁');
 assert.deepEqual(Array.from(result.stations,s=>s.ko),['경복궁']);
 assert.ok(!result.answer.endsWith('\n경복궁역'));
});
test('fallback does not guess when no explicit recommended standalone stop exists',()=>{
 const examples=[
  '코엑스몰은 삼성역과 봉은사역에서 접근할 수 있습니다.',
  '강남에 있는 박물관입니다.\n강남역',
  '3호선 경복궁역이 가깝습니다.\n<menu_recommendation>none</menu_recommendation>',
  '3호선 경복궁역이 가깝습니다.\n<route_station>가짜역</route_station>',
  '3호선 경복궁역이 가깝습니다.\n<route_station>경복궁</route_station>\n<route_station>광화문</route_station>'
 ];
 for(const answer of examples)assert.equal(parsePlaceAnswer(answer).station,null,answer);
 assert.equal(parsePlaceAnswer('지하철은 경복궁역 5번 출구를 이용하세요.\n경복궁역',false).station,null);
});
test('explicit route hint is preferred over other stations mentioned in prose',()=>{
 const result=parsePlaceAnswer('국립고궁박물관은 경복궁역과 광화문역에서 갈 수 있습니다.\n<route_station>경복궁</route_station>\n<menu_recommendation>route</menu_recommendation>');
 assert.equal(result.station.ko,'경복궁');
 assert.equal(result.stations.length,1);
});

test('optional walking hint is a safe, single-response extension',()=>{
 const withWalk='고른햇살은 안암역 인근에 있습니다.\n<walk_hint>안암역 2번 출구를 이용하세요.</walk_hint>\n<route_station>안암역</route_station>\n<menu_recommendation>route</menu_recommendation>';
 const found=parsePlaceAnswer(withWalk);
 assert.equal(found.status,'found');
 assert.equal(found.station.ko,'안암');
 assert.equal(found.walk,'안암역 2번 출구를 이용하세요.');
 assert.doesNotMatch(found.answer,/walk_hint|route_station/);
 assert.equal(parsePlaceAnswer(withWalk,false).walk,'');
 const noWalk=parsePlaceAnswer('국립고궁박물관은 경복궁역 부근입니다.\n<route_station>경복궁역</route_station>\n<menu_recommendation>route</menu_recommendation>');
 assert.equal(noWalk.status,'found');
 assert.equal(noWalk.walk,'');
 const badWalk=parsePlaceAnswer('안암역 인근입니다.\n<walk_hint>1번 출구</walk_hint>\n<walk_hint>2번 출구</walk_hint>\n<route_station>안암역</route_station>\n<menu_recommendation>route</menu_recommendation>');
 assert.equal(badWalk.walk,'');
 assert.equal(badWalk.station,null);
 const none=parsePlaceAnswer('장소가 모호합니다.\n<walk_hint>미확인 정보</walk_hint>\n<menu_recommendation>none</menu_recommendation>');
 assert.equal(none.walk,'');
});

test('last-mile uses one Google Maps browser link in all four UI languages',()=>{
 assert.match(page,/google\.com\/maps\/search\/\?api=1&query=/);
 assert.match(page,/encodeURIComponent\(place\.place\|\|query\.trim\(\)\)/);
 assert.match(page,/place\.walk\|\|t\.walkingUnknown/);
 assert.match(page,/rl-walk-guide/);
 assert.doesNotMatch(page,/kakaomap:\/\/|by=foot|\/v2\/routing\/walk/);
 assert.match(css,/rl-walk-actions/);
 assert.match(css,/grid-template-columns:1fr/);
 assert.doesNotMatch(page,/KakaoMap|카카오맵|カカオマップ|m\.map\.kakao\.com|mapKakao|mapGuide/);
 assert.equal((page.match(/google\.com\/maps\/search\/\?api=1&query=/g)||[]).length,1);
 for(const lang of ['ko','en','ja','zh'])assert.match(page,new RegExp(lang+":\\{walkingTitle:.*?mapGoogle:"));
 assert.match(buildRoutePlacePrompt('고른햇살','ko',{stationCode:'0154',line:'1',names:{ko:'종로5가'}},'Korean'),/<walk_hint>/);
});


test('full-route timeline labels every visited station using official ride lines and transfer segments',()=>{
 const route={allStations:['종로5가','종로3가','안국','경복궁'],itinerary:[
  {type:'ride',line:'1호선',from:'종로5가',to:'종로3가',stations:['종로5가','종로3가']},
  {type:'transfer',station:'종로3가',fromLine:'1호선',toLine:'3호선'},
  {type:'ride',line:'3호선',from:'종로3가',to:'경복궁',stations:['종로3가','안국','경복궁']}
 ]};
 const timeline=buildRouteStationTimeline(route);
 assert.deepEqual(timeline.map(s=>s.name),route.allStations);
 assert.deepEqual(timeline.map(s=>s.lines),[['1호선'],['1호선','3호선'],['3호선'],['3호선']]);
 assert.deepEqual(timeline.map(s=>s.transfer),[false,true,false,false]);
 assert.equal(timeline[0].start,true);assert.equal(timeline.at(-1).end,true);
 assert.equal(timeline[1].end,false);
});
test('full-route timeline does not fabricate lines from station names when route segment is missing',()=>{
 const timeline=buildRouteStationTimeline({allStations:['역A','역B'],itinerary:[]});
 assert.deepEqual(timeline.map(s=>s.lines),[[],[]]);
 assert.deepEqual(timeline.map(s=>s.transfer),[false,false]);
 assert.deepEqual(buildRouteStationTimeline(null),[]);
 const once=buildRouteStationTimeline({allStations:['삼성','선릉'],itinerary:[{type:'ride',line:'2호선',stations:['삼성','선릉','선릉']}]});
 assert.deepEqual(once.map(s=>s.lines),[['2호선'],['2호선']]);
});
test('route lab has a translated full-route toggle with line-colored stops and transfer highlights',()=>{
 assert.match(page,/buildRouteStationTimeline\(route\)/);
 assert.match(page,/allRouteStops\.length>0&&<details className="rl-all-stations"/);
 assert.match(page,/allRouteStops\.map\(\(stop,i\)=>/);
 assert.match(page,/stop\.lines\.map\(line=><LineBadge/);
 assert.match(page,/stop\.transfer&&<span className="rl-all-transfer-label"/);
 for(const label of ['경유역 전체보기','Show all stations','全経由駅を見る','查看全部途经站'])assert.ok(page.includes(label),label);
 assert.match(page,/normalizeLine=x=>String\(x\|\|''\)\.replace\(/);
 assert.match(css,/\.rl-all-stations-list\{/);
 assert.match(css,/\.rl-all-stations-list\{display:flex;align-items:center;flex-wrap:wrap/);
 assert.match(css,/\.rl-all-stop-chip\{display:inline-flex/);
 assert.match(css,/\.rl-all-transfer \.rl-all-stop-chip/);
 assert.doesNotMatch(css,/\.rl-all-stations-list[^\n]*max-height:260px/);
 assert.doesNotMatch(css,/\.rl-all-stop-rail|\.rl-all-stop-track|min-height:53px/);
 assert.match(page,/compact\/>/);
 assert.match(page,/!stop\.end&&<span className="rl-all-stop-arrow"/);
 assert.doesNotMatch(page,/step\.stations\.slice\(1,-1\)/);
 assert.match(page,/\/api\/subway-route\?/);
});

test('Gemini Markdown emphasis renders as safe React nodes',()=>{assert.ok(page.includes("renderRouteAnswer(place.answer||t.unknown)"));assert.ok(page.includes("<strong key={i}>"));});
test('V2 inherited station language and preserved other menus',()=>{
 assert.ok(v2.includes("embedded stationContext={stationContext} language={lang} active={view==='route'}"));
 assert.ok(v2.includes("menuItems.filter(x=>x.action&&x.id!=='route')"));
 assert.ok(v2.includes("onRecommendMenu={id==='chat'?navigate:null}"));
 assert.ok(standalone.includes("import UnifiedRouteLab from './RouteLab'"));
 assert.ok(page.includes("useState(stationContext?.stationCode||'0154')"));
 assert.ok(page.includes("const lang=embedded&&COPY[language]?language:standaloneLang"));
});
test('V2 route form and result are browser history entries',()=>{
 assert.ok(v2.includes("key==='route:form'||key==='route:result'"));
 assert.ok(page.includes("navigationSnapshot.data?.routeState"));
 assert.ok(page.includes("saveNavigation('route:result',{query:searchTerm,place:placeResult,route:result.route})"));
 assert.ok(page.includes("saveNavigation('route:form',{query:value,picked:null,route:null,place:null,aiMs:null})"));
});
test('transfer icon contrast and Google Maps fallback',()=>{
 assert.ok(page.includes('<svg width="16" height="16"'));
 assert.ok(css.includes('.rl-all-transfer-label{width:23px;height:23px'));
 assert.ok(page.includes("encodeURIComponent(place.place||query.trim())"));
});

test('changing a route option or searching another stop creates a V2 form back-history state',()=>{
 assert.ok(page.includes("saveNavigation('route:form',{mode:x,route:null})"));
 assert.ok(page.includes("saveNavigation('route:form',{place:null,route:null,picked:null})"));
});

test('embedded-only header and footer JSX are closed correctly',()=>{
 assert.match(page,/<\/div>}\s*<h1>\{t\.title\}<\/h1>/);
 assert.ok(page.includes("</footer>}\n  </div>\n </Root>"));
});

test('V2 route cards drop decorative kickers, AI timings and location source UI',()=>{
 assert.doesNotMatch(page,/GEMINI · GOOGLE SEARCH|OFFICIAL SUBWAY ROUTE API|WALKING · WEB MAP/);
 for(const obsolete of ['className="rl-title-icon"','className="rl-timing"','className="rl-sources"','className="rl-route-note"','className="rl-connection"','className="rl-field-note"'])assert.ok(!page.includes(obsolete),obsolete);
 assert.match(page,/renderRouteAnswer\(place\.answer\|\|t\.unknown\)/);
 assert.match(page,/className="rl-result-card rl-route-card"/);
 assert.match(page,/className="rl-result-card rl-walk-guide"/);
});
test('compact form has a single departure station row, 3 equal path options, and one row of examples',()=>{
 assert.ok(page.includes('className="rl-field-head"><label>{t.origin}</label><div className="rl-station-box"'));
 assert.ok(page.includes('aria-expanded={originOpen}'));
 assert.ok(page.includes('className="rl-route-options"><div role="group" aria-label={t.options}>'));
 assert.ok(page.includes("EXAMPLES.slice(0,3).map"));
 assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(css.includes('.route-lab .rl-examples>div{display:flex;align-items:center;gap:4px;flex:1;min-width:0;flex-wrap:nowrap'));
 assert.ok(css.includes('font-size:16px;color:#203a35')); // avoid iOS text-field zoom
});
test('recommended stop shows centered numeric line badges; station timeline scrolls in the parent only',()=>{
 assert.ok(page.includes('className="rl-recommend-station"'));
 assert.ok(page.includes('place.station.lines?.map(line=><LineBadge key={line} line={line} lang={lang} compact/>)'));
 assert.ok(css.includes('.route-lab .rl-recommend .rl-recommend-station{display:flex;align-items:center;justify-content:center'));
 assert.ok(css.includes('.route-lab .rl-all-stations-list{max-height:none;overflow:visible;overscroll-behavior:auto}'));
 assert.ok(!css.includes('.rl-all-stations-list{display:flex;align-items:center;flex-wrap:wrap;gap:6px 0;padding:13px 10px;max-height:260px;overflow-y:auto'));
 assert.ok(page.includes('allRouteStops.map((stop,i)=>'));
});
