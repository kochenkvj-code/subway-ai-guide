import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const context=vm.createContext({URL});
const cache=new Map();
async function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(fs.readFileSync(file,'utf8')));},{context}):new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});cache.set(file,m);await m.link(name=>load(path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.js')));return m;}
const mod=await load('app/lib/station-entry.js');await mod.evaluate();const {getBrowserLanguage,readStationEntry,stationEntryUrl}=mod.namespace;
test('URL is the station authority; only a missing code defaults, unknown/empty/numeric-looking shortened IDs do not',()=>{
 assert.equal(readStationEntry('https://app.test/v2').station.stationCode,'0154');
 for(const code of ['0152','0153','0319','2535','2637'])assert.equal(readStationEntry('https://app.test/v2?station='+code).station.stationCode,code);
 for(const code of ['','154','9999','0200','jongno5ga-1','종각'])assert.equal(readStationEntry('https://app.test/v2?station='+encodeURIComponent(code)).station,null);
});
test('home/gate links preserve leading zeros and selected language, with development and root mount parity',()=>{
 for(const basePath of ['/v2','/'])for(const lang of ['ko','en','ja','zh'])for(const gate of [false,true]){
  const value=stationEntryUrl({origin:'https://app.test',basePath,stationCode:'2637',language:lang,gate});const url=new URL(value);assert.equal(url.pathname,basePath);assert.equal(url.searchParams.get('station'),'2637');assert.equal(url.searchParams.get('view'),gate?'gate':null);assert.equal(url.searchParams.get('lang'),lang==='ko'?null:lang);assert.equal(readStationEntry(value,lang).station.line,'6');assert.equal(readStationEntry(value,lang).language,lang);
 }
});
test('legacy gate entry falls back to English when no browser preference is supplied',()=>{
 const a=readStationEntry('https://app.test/v2?station=0152&from=gate');assert.equal(a.legacyGate,true);assert.equal(a.language,'en');assert.equal(readStationEntry('https://app.test/v2?station=0152&from=gate&lang=ja').language,'ja');
});
test('browser primary language maps supported regional locales and defaults safely to English',()=>{
 for(const [locale,expected] of [['ko-KR','ko'],['ko','ko'],['en-US','en'],['en-GB','en'],['ja-JP','ja'],['zh-CN','zh'],['zh-TW','zh'],['ZH-hant-TW','zh'],['fr-FR','en'],['de-DE','en'],['th-TH','en'],['','en'],[null,'en'],[undefined,'en']])assert.equal(getBrowserLanguage({language:locale}),expected);
 assert.equal(getBrowserLanguage(undefined),'en');
 assert.equal(getBrowserLanguage({get language(){throw Error('unavailable');}}),'en');
 assert.equal(getBrowserLanguage({language:'fr-FR',languages:['fr-FR','ja-JP']}),'en');
});
test('root, V2 and gate entries use browser language unless a supported URL language is explicit',()=>{
 for(const path of ['/','/v2'])for(const suffix of ['','&view=gate','&from=gate'])for(const language of ['ko','en','ja','zh']){
  const href='https://app.test'+path+'?station=0154'+suffix;
  assert.equal(readStationEntry(href,language).language,language);
  for(const explicit of ['ko','en','ja','zh'])assert.equal(readStationEntry(href+'&lang='+explicit,language).language,explicit);
  assert.equal(readStationEntry(href+'&lang=fr',language).language,language);
 }
});
test('manual Korean remains selected through station changes even though Korean QR links omit lang',()=>{
 const href=stationEntryUrl({origin:'https://app.test',basePath:'/',stationCode:'0152',language:'ko'});
 assert.equal(new URL(href).searchParams.has('lang'),false);
 assert.equal(readStationEntry(href,'ko').language,'ko');
});
test('copied QR URLs are canonical and reject unknown stations, arbitrary paths and unsupported languages',()=>{
 const value=stationEntryUrl({origin:'https://app.test/v2?place=123&view=tour',basePath:'/',stationCode:'0154'});assert.equal(value,'https://app.test/?station=0154');
 for(const bad of [{stationCode:'9999'},{basePath:'/v2/station-master'},{language:'fr'}])assert.throws(()=>stationEntryUrl({origin:'https://app.test',basePath:'/v2',stationCode:'0154',...bad}));
});

test('station choice does not auto-open QR addresses or close the station selector',()=>{
 const component=fs.readFileSync('app/v2/StationEntry.jsx','utf8');
 const begin=component.indexOf(' function choose(station){');
 const end=component.indexOf(' function changedLanguage',begin);
 assert.ok(begin>=0&&end>begin);
 const choose=component.slice(begin,end);
 assert.match(choose,/setAddressesOpen\(false\)/);
 assert.match(choose,/setEntry\(next\)/);
 assert.doesNotMatch(choose,/setPanel\(null\)/);
 assert.match(component,/onClick=\{\(\)=>\{setAddressesOpen\(v=>!v\);setNotice\(''\);\}\}/);
 assert.match(component,/onClick=\{\(\)=>setPanel\(null\)\} aria-label=\{t\.close\}/);
});

test('station picker reuses the existing home QR popup for regular visitors and administrators',()=>{
 const code=fs.readFileSync('app/v2/StationEntry.jsx','utf8');
 assert.match(code,/import \{AccessQR\} from '\.\/StaffTools'/);
 assert.match(code,/className="se-current-with-qr"/);
 assert.match(code,/panel==='select'&&<AccessQR stationCode=\{entry\.code\}/);
 assert.match(code,/view="home" menuName=\{t\.qrHome\} basePath=\{basePath\} lang=\{entry\.language\}/);
 assert.doesNotMatch(code,/staffTools\.qr/);
 assert.match(code,/onClick=\{\(\)=>\{setAddressesOpen\(v=>!v\);setNotice\(''\);\}\}/);
});
test('shared QR popup offers downloadable PNG alongside unchanged copy action',()=>{
 const code=fs.readFileSync('app/v2/StaffTools.jsx','utf8');
 assert.match(code,/QRCode\.toDataURL\(url\.href/);
 assert.match(code,/new Blob\(\[bytes\],\{type:'image\/png'\}\)/);
 assert.match(code,/URL\.createObjectURL/);
 assert.match(code,/URL\.revokeObjectURL/);
 assert.match(code,/className="sag-qr-actions"/);
 assert.match(code,/className="sag-qr-download" href=\{downloadUrl\|\|undefined\} download=\{fileName\}/);
 for(const label of ['QR 다운로드','Download QR','QRを保存','下载二维码'])assert.ok(code.includes(label));
});

test('QR popup shows a matching colored line circle before the station name and menu label',()=>{
 const code=fs.readFileSync('app/v2/StaffTools.jsx','utf8');
 const css=fs.readFileSync('app/v2/staff-tools.css','utf8');
 assert.match(code,/import \{getStationByCode\} from '\.\.\/lib\/station-master'/);
 assert.match(code,/const stationInfo=getStationByCode\(stationCode\)/);
 assert.match(code,/className="sag-qr-context"/);
 assert.match(code,/className="sag-qr-line" style=\{\{backgroundColor:stationInfo\.color\}\}/);
 assert.match(code,/className="sag-qr-station-name"\>\{stationName\}<\/span>/);
 assert.match(code,/className="sag-qr-menu-name"\>\{menuName\}<\/span>/);
 assert.match(css,/flex:0 0 18px;width:18px;height:18px/);
 assert.match(css,/\.sag-qr-station-name,\.sag-qr-dialog \.sag-qr-menu-name\{font-weight:750\}/);
 assert.match(css,/\.sag-qr-dialog \.sag-qr-line/);
 assert.match(code,/className="sag-qr-download" href=\{downloadUrl\|\|undefined\} download=\{fileName\}/);
});

test('station QR uses deployment copy; every menu keeps its original passenger QR copy',()=>{
 const entry=fs.readFileSync('app/v2/StationEntry.jsx','utf8');
 const qr=fs.readFileSync('app/v2/StaffTools.jsx','utf8');
 const menu=fs.readFileSync('app/v2/V2Guide.jsx','utf8');
 assert.match(entry,/qrHome:'메인 화면'/);
 assert.match(entry,/lang=\{entry\.language\} stationPicker\/>/);
 assert.match(qr,/stationPicker=false/);
 assert.match(qr,/stationTitle:'역별 접속 QR코드'/);
 assert.match(qr,/stationScan:'QR코드를 스캔하면 선택한 역의 메인 화면으로 연결됩니다\.'/);
 assert.match(qr,/stationPicker\?t\.stationTitle:t\.title/);
 assert.match(qr,/stationPicker\?t\.stationScan:t\.scan/);
 assert.match(qr,/title:'내 휴대폰에서 안내받기'/);
 assert.doesNotMatch(menu,/stationPicker/);
});

test('AI route name is consistent in all four menu languages and the route QR popup',()=>{
 const source=fs.readFileSync('app/v2/copy.js','utf8');
 const guide=fs.readFileSync('app/v2/V2Guide.jsx','utf8');
 for(const label of ['AI 길찾기','AI Route Finder','AI 経路検索','AI 路线查询'])
  assert.ok(source.includes("menu:['"+label+"'"),label);
 assert.match(guide,/const title=view==='chat'\?t\.chat:view==='live'\?t\.liveTitle:t\.menu\[menuItems\.findIndex\(x=>x\.id===view\)\]/);
 assert.match(guide,/staffTools\.qr&&<AccessQR[^>]*menuName=\{title\}/);
 assert.match(guide,/<strong>\{t\.menu\[index\]\}<\/strong>/);
});
