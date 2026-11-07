import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {buildV2Prompt,buildV2RoutePrompt} from '../app/lib/v2-chat-policy.js';

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
const page=await read('app/v2/route-lab/page.jsx');
const api=await read('app/api/v2/route-place-test/route.js');
const css=await read('app/v2/route-lab/route-lab.css');

test('V2 route assistant keeps exact normal-chat grounding, station and language core',()=>{
 const station={stationCode:'0154',line:'1',names:{ko:'종로5가'}};
 const chat=buildV2Prompt('코엑스','ko',station,'Korean language rule');
 const routed=buildV2RoutePrompt('코엑스','ko',station,'Korean language rule');
 const chatMarker='\nOPTIONAL MENU RECOMMENDATION (no tool call or API execution):';
 const routeMarker='\nDESTINATION WAYFINDING EXTENSION';
 assert.ok(chat.indexOf(chatMarker)>0);
 assert.ok(routed.indexOf(routeMarker)>0);
 assert.equal(routed.slice(0,routed.indexOf(routeMarker)),chat.slice(0,chat.indexOf(chatMarker)));
 for(const key of ['Google Search grounding','Independently answer','NOT nonexistent','LINE-SPECIFIC STATION IDENTITY','Korean language rule','<route_station>','<menu_recommendation>route</menu_recommendation>'])
  assert.ok(routed.includes(key),key);
 assert.equal(buildV2Prompt('코엑스','ko',station,'Korean language rule'),chat,
  'normal V2 chat prompt is unchanged');
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
 assert.match(page,/lookupRoute\(result\.station,ctrl\.signal\)/);
 assert.match(page,/\['duration','distance','transfer'\]/);
 assert.match(page,/aiTitle:'AI 목적지 안내'/);
 assert.match(css,/max-width:490px/);
});

test('route API reuses V2 chat prompt and model settings without gating on citation cards',()=>{
 assert.match(api,/buildV2RoutePrompt\(query,lang,station,languageOutputRule\(lang\)\)/);
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
 const prompt=buildV2RoutePrompt('국립고궁박물관','ko',{stationCode:'0154',line:'1',names:{ko:'종로5가'}},'Korean');
 assert.match(prompt,/DESTINATION WAYFINDING EXTENSION/);
 assert.doesNotMatch(prompt,/FAST PRIMARY RECOMMENDATION|Do NOT perform additional Google searches|SECOND station|two alternative stations|optimal route/);
 assert.match(prompt,/<route_station>official Korean station name only<\/route_station>/);
 assert.match(page,/lookupRoute\(result\.station,ctrl\.signal\)/);
 assert.doesNotMatch(page,/compareOfficialRoutes|preferredRouteOption|Promise\.all\(stations\.slice|AbortSignal\.timeout\(6000\)/);
 assert.match(page,/aiMs\/1000/);
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
