import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadAppModule} from './helpers/load-app-module.mjs';
import {trainLostDestination} from '../app/lib/train-lost-destination.mjs';
import {positionDestination} from '../app/arrival-test/position/destination.js';

const official=JSON.parse(await readFile('app/data/seoulMetroOfficialStations.json','utf8'));
const compatibility=JSON.parse(await readFile('app/data/stationNameAliases.json','utf8'));
const {stationName,stationLabelResult,destinationForApi}=await loadAppModule('app/lib/stationNameI18n.js');
const {officialStationName,officialStationMatches,officialCodeForName}=await loadAppModule('app/lib/officialStations.js');
const {trainStationDisplay}=await loadAppModule('app/lib/train-lost.js');
const {translateFacilityText}=await loadAppModule('app/lib/facility-i18n.js');
const languages=['ko','en','ja','zh'];
const label=(name,lang,line)=>stationLabelResult(name,lang,{line});

test('all 799 line/code records resolve in four languages without borrowing another platform',()=>{
 assert.equal(official.length,799);
 for(const station of official)for(const lang of languages){
  const result=stationLabelResult(station.ko,lang,{code:station.code,line:station.line});
  assert.equal(result.status,'translated',station.code+': '+lang);
  assert.equal(result.text,station[lang].normalize('NFC').trim().replace(/\s+/g,' '));
  assert.equal(Object.hasOwn(result,'code'),false,'display lookup must not select a route code');
 }
 assert.equal(label('별내','en','8').text,'Byeollae');
 assert.equal(label('별내','en','경춘선').text,'Byeollae');
 assert.equal(label('별내','en','1').status,'untranslated');
 assert.equal(stationLabelResult('별내','en',{code:'0154'}).status,'untranslated');
 assert.equal(label('서울','en','1').text,'Seoul Station');
 assert.equal(label('서울','en','GTX-A').text,'Seoul');
});

test('missing, untranslated and translated labels have distinct results; source text survives',()=>{
 for(const lang of languages){
  assert.equal(stationLabelResult(null,lang).status,'missing');
  assert.equal(stationName('   ',lang),'');
  assert.equal(stationLabelResult('새로운 임시행선지',lang).status,'untranslated');
  assert.equal(stationName('새로운 임시행선지',lang),'새로운 임시행선지');
  if(lang!=='ko')assert.equal(stationName('새로운 임시행선지',lang,false),'');
 }
 assert.equal(stationName('성수(내선)','ko'),'성수(내선)');
});

test('compatibility labels retain input mapping but never supply a display translation',()=>{
 for(const [alias,ko]of Object.entries(compatibility.aliases))assert.equal(destinationForApi(alias),ko,alias);
 assert.equal(stationName('능길','ko'),'신길온천');
 assert.equal(stationName('4.19민주묘지','ko'),'4·19민주묘지');
 for(const lang of languages){
  assert.equal(stationName('능길',lang),stationName('신길온천',lang));
  assert.equal(stationName('4.19민주묘지',lang),stationName('4·19민주묘지',lang));
 }
 for(const alias of ['カンナム','江南'])assert.equal(destinationForApi(alias),'강남');
 assert.equal(destinationForApi('汉阳大学'),'한양대');
 assert.equal(destinationForApi('강남'),'강남');
});

test('name lookup never uses partial station names or unknown text as API input',()=>{
 for(const input of ['강남구','미등록역','Not a station','0222'])assert.equal(destinationForApi(input),null);
 assert.equal(destinationForApi('Gangnam Station'),'강남');
 assert.equal(destinationForApi('하남검단산역'),'하남검단산');
});

test('every 1–9 line graph name is displayable in four languages without changing the graph',async()=>{
 const graph=JSON.parse(await readFile('app/data/trainLostGraph.json','utf8'));
 for(const [line,stations]of Object.entries(graph))for(const name of Object.keys(stations))for(const lang of languages){
  const source=trainStationDisplay(line.replace('호선',''),name);
  assert.equal(label(source,lang,line).status,'translated',line+': '+name+': '+lang);
 }
});

test('main/live and lost-item destinations show the extension stations in all languages',()=>{
 for(const ko of ['장자호수공원','구리','동구릉','다산','별내'])for(const lang of languages){
  const expected=label(ko,lang,'8').text;
  assert.equal(positionDestination(ko,lang,stationName,'8','0').name,expected);
  const result=trainLostDestination({line:'8',raw:ko,station:'암사',direction:'0',lang},name=>label(name,lang,'8'));
  assert.equal(result.value,expected);
  assert.equal(result.status,'translated');
  assert.ok(result.text.includes(expected));
 }
});

test('unknown API destinations are preserved in main/live and lost-item views, including Korean',()=>{
 for(const lang of languages)for(const line of ['1','2','6','8']){
  const source='알려지지않은행선지(임시)';
  const result=trainLostDestination({line,raw:source,station:'시청',direction:'1',lang},name=>label(name,lang,line));
  assert.equal(result.raw,source);
  assert.equal(result.status,'untranslated');
  assert.equal(result.text,source);
  assert.equal(positionDestination(source,lang,stationName,line,'1').full,source);
 }
 const missing=trainLostDestination({line:'8',raw:'',station:'암사',direction:'0',lang:'en'},name=>label(name,'en','8'));
 assert.equal(missing.status,'missing');assert.equal(missing.value,null);
});

test('existing Line 2 loop, terminus and branch presentation survives dictionary integration',()=>{
 for(const lang of languages){
  for(const [raw,dir]of [['성수(내선)','0'],['성수(외선)','1'],['성수종착','0'],['성수순환','1']]){
   const result=trainLostDestination({line:'2',raw,station:'시청',direction:dir,lang},name=>label(name,lang,'2'));
   assert.equal(result.kind,'terminus');assert.equal(result.status,'translated');
   assert.ok(result.text.includes(stationName('성수',lang)));
  }
  for(const raw of ['성수지선','신도림지선']){
   const result=trainLostDestination({line:'2',raw,station:'용답',direction:'0',lang},name=>label(name,lang,'2'));
   assert.equal(result.text,positionDestination(raw,lang,stationName,'2','0').full);
  }
  for(const [raw,dir]of [['내선순환','0'],['외선순환','1']]){
   assert.equal(trainLostDestination({line:'2',raw,station:'시청',direction:dir,lang},name=>label(name,lang,'2')).kind,'loop');
  }
 }
});

test('Line 6 Eungam loop retains track information using the existing live formatter',()=>{
 for(const lang of languages)for(const raw of ['응암순환','응암순환(상선)','응암순환(하선)']){
  const result=trainLostDestination({line:'6',raw,station:'응암',direction:'0',lang},name=>label(name,lang,'6'));
  assert.equal(result.text,positionDestination(raw,lang,stationName,'6','0').full);
  assert.equal(result.status,'translated');
 }
});

test('facility station directions translate extension names and retain car/door codes',()=>{
 for(const lang of ['en','ja','zh'])for(const suffix of ['6-1','2-4']){
  const result=translateFacilityText('장자호수공원 방면'+suffix,lang);
  assert.equal(result.untranslated,false);
  assert.ok(result.text.includes(stationName('장자호수공원',lang)));
  assert.ok(result.text.endsWith(suffix));
 }
 assert.equal(translateFacilityText('새로운 장소 방면6-1','en').untranslated,true);
});

test('route display wrappers share names while existing search grouping and code selection remain intact',()=>{
 for(const lang of languages)for(const ko of ['별내','강남','종로3가'])assert.equal(officialStationName(ko,lang,stationName),stationName(ko,lang));
 assert.equal(officialCodeForName('종로3가'),'0153');
 const jongno=officialStationMatches('종로3가','ko').find(s=>s.ko==='종로3가');
 assert.deepEqual(Array.from(jongno.codes),['0153','0319','2535']);
 assert.ok(officialStationMatches('ㅂㄴ','ko').some(s=>s.ko==='별내'));
});
