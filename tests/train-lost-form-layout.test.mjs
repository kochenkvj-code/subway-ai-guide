import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [ui,model,styles]=await Promise.all([
 readFile(new URL('../app/v2/TrainLostUI.jsx',import.meta.url),'utf8'),
 readFile(new URL('../app/v2/TrainLostFinder.jsx',import.meta.url),'utf8'),
 readFile(new URL('../app/v2/train-lost-redesign.css',import.meta.url),'utf8'),
]);

test('alighting station and line stay editable in a compact upper-right header',()=>{
 assert.match(ui,/tl-hero-compact/);
 assert.match(ui,/tl-station-mini-name/);
 assert.match(ui,/tl-station-mini-line/);
 assert.match(ui,/onClick={closeStation}/);
 assert.match(ui,/lines\.map\(l=>/);
 assert.match(ui,/tl-station-picker-mini/);
 assert.doesNotMatch(ui,/tl-station-layout/);
});
test('car position uses ordinary 1–10 car numbers, never relative front/rear counts',()=>{
 assert.match(ui,/length:10/);
 assert.match(ui,/onClick=\{\(\)=>setCarNumber\(n\)\}/);
 for(const source of [ui,model]){
  assert.doesNotMatch(source,/carMode|relativeSide|relativeMode|setCarMode|setRelativeSide/);
 }
 assert.match(model,/carNumber\+'-'\+door/);
 assert.match(ui,/!carNumber&&v\.requiredCar/);
 assert.match(ui,/!door&&v\.requiredDoor/);
});
test('door and item position use independent 2x2 controls in one two-column row',()=>{
 assert.match(ui,/className="tl-location-grid"/);
 assert.match(ui,/className="tl-door-options"/);
 assert.match(ui,/className="tl-mini-list"/);
 assert.match(styles,/\.tl-location-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(styles,/\.tl-location-grid \.tl-door-options,/);
 assert.match(styles,/\.tl-location-grid \.tl-mini-list\{/);
 assert.match(ui,/setPlace\(place===id\?'':id\)/);
});
test('four languages retain car, door and item-place labels',()=>{
 for(const label of ['탑승 호차','Car number','乗車した車両番号','乘坐的车厢编号'])assert.ok(ui.includes(label),label);
 assert.match(ui,/lang==='en'\?'Car '\+carNumber/);
 assert.match(ui,/lang==='zh'\?'第'\+carNumber/);
});
