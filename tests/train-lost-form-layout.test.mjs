import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [ui,model,styles]=await Promise.all([
 readFile(new URL('../app/v2/TrainLostUI.jsx',import.meta.url),'utf8'),
 readFile(new URL('../app/v2/TrainLostFinder.jsx',import.meta.url),'utf8'),
 readFile(new URL('../app/v2/train-lost-redesign.css',import.meta.url),'utf8'),
]);

test('original header and station/line form are restored',()=>{
 assert.match(ui,/className="tl-hero"/);
 assert.match(ui,/className="tl-station-layout"/);
 assert.match(ui,/className="tl-station-trigger"/);
 assert.match(ui,/className="tl-station-line-select"/);
 assert.match(ui,/onClick={closeStation}/);
 assert.doesNotMatch(ui,/tl-hero-compact|tl-station-mini|tl-station-picker-mini/);
 assert.ok(ui.includes("className={'tl-required-status'"));
});

test('ordinary 1–10 train-car buttons stay without relative car counting',()=>{
 assert.match(ui,/length:10/);
 assert.match(ui,/onClick=\{\(\)=>setCarNumber\(n\)\}/);
 for(const source of [ui,model])
  assert.doesNotMatch(source,/carMode|relativeSide|relativeMode|setCarMode|setRelativeSide/);
 assert.match(model,/carNumber\+'-'\+door/);
 assert.match(ui,/!carNumber&&v\.requiredCar/);
 assert.match(ui,/!door&&v\.requiredDoor/);
});

test('lost item and four compact location choices share one row without wrapping',()=>{
 assert.match(ui,/className="tl-item-place-row"/);
 assert.match(ui,/className="tl-field tl-item-field"/);
 assert.match(ui,/className="tl-field tl-place-field"/);
 assert.match(styles,/\.tl-item-place-row\{\s*display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.5fr\)/);
 assert.match(styles,/\.tl-item-place-row \.tl-mini-list\{\s*display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(ui,/setPlace\(place===id\?'':id\)/);
 assert.match(ui,/aria-label=\{u\[id\]\}/);
 for(const label of ['문근처','Rack','ドア','车门'])assert.ok(ui.includes(label),label);
 assert.match(styles,/white-space:nowrap;overflow:hidden/);
 assert.doesNotMatch(ui,/className="tl-location-grid"/);
});

test('four door numbers remain on one full-width row below car buttons',()=>{
 assert.match(ui,/className="tl-door-block"/);
 assert.match(ui,/className="tl-door-options"/);
 assert.match(ui,/\['1','2','3','4'\]\.map/);
 assert.match(styles,/\.tl-car-door-field \.tl-door-options\{\s*display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test('four languages retain car, door and item-place labels',()=>{
 for(const label of ['탑승 호차','Car number','乗車した車両番号','乘坐的车厢编号'])assert.ok(ui.includes(label),label);
 assert.match(ui,/lang==='en'\?'Car '\+carNumber/);
 assert.match(ui,/lang==='zh'\?'第'\+carNumber/);
});
