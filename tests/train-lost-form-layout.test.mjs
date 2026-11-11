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

test('elapsed-time toolbar stays on one line, with one value and no duplicate end labels',()=>{
 assert.match(ui,/className="tl-time-topline"/);
 assert.match(ui,/className="tl-time-prompt"/);
 assert.match(ui,/className="tl-time-range"/);
 assert.match(ui,/className="tl-time-value"/);
 assert.match(ui,/w\.prompt/);
 assert.match(ui,/w\.range/);
 assert.doesNotMatch(ui,/className="tl-slider-head"/);
 assert.doesNotMatch(ui,/className="tl-slider-ends"/);
 assert.match(styles,/\.tl-time-field \.tl-time-topline\{\s*display:flex;align-items:center;justify-content:space-between;/);
 assert.match(styles,/\.tl-time-field \.tl-time-prompt\{\s*display:flex;align-items:center;/);
 assert.match(styles,/\.tl-time-field \.tl-time-value\{\s*flex:none;/);
});
test('slider retains 0–30 one-minute increments and quick choices including optional exact time',()=>{
 assert.match(ui,/className="tl-time-slider" type="range" min="0" max="30" step="1"/);
 assert.match(ui,/\[3,5,10,15\]\.map/);
 assert.match(ui,/className="tl-chip tl-chip-manual"/);
 assert.match(ui,/aria-pressed=\{quickMin===null\}/);
 assert.match(ui,/onClick=\{\(\)=>setQuickMin\(null\)\}/);
 assert.match(ui,/\{quickMin===null&&<label className="tl-time-summary tl-time-edit"/);
 assert.match(ui,/setWhen\(\{date:kstAlightDateForTime\(e\.target\.value\),time:e\.target\.value\}\)/);
 assert.match(styles,/\.tl-time-field \.tl-times\{\s*display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 for(const label of ['시각 입력','Set time','時刻入力','输入时间'])assert.ok(ui.includes(label),label);
});

test('elapsed-time value and slider share a dedicated meter above the quick choices',()=>{
 const start=ui.indexOf('className="tl-time-meter"');
 const header=ui.indexOf('className="tl-time-topline"',start);
 const slider=ui.indexOf('className="tl-time-slider"',header);
 const meterEnd=ui.indexOf('</div>',slider);
 const choices=ui.indexOf('className="tl-times"',slider);
 assert.ok(start!==-1&&header>start&&slider>header&&meterEnd>slider&&choices>meterEnd,
  'header and slider should be grouped directly above shortcuts');
 assert.match(styles,/\.tl-time-field \.tl-time-meter\{\s*display:flex;flex-direction:column;/);
 assert.match(styles,/\.tl-time-field \.tl-time-slider\{\s*margin:10px 0 0/);
});

test('exactly the selected train-lost stage receives the strong active styling',()=>{
 assert.match(ui,/className=\{'tl-step'\+\(i\+1===stageNumber\?' current'/);
 assert.match(ui,/aria-current=\{i\+1===stageNumber\?'step':undefined\}/);
 assert.match(styles,/\.tl-stepbar button\.tl-step\.current,\s*\.tf-redesign\.tl-three-stage \.tl-stepbar button\.tl-step\.current:not\(:disabled\):hover\{\s*background:#176c50;border-color:#176c50;color:#fff;/);
 assert.match(styles,/\.tl-stepbar button\.tl-step\.done\{\s*background:#eff8f2/);
 assert.match(styles,/\.tl-stepbar button\.tl-step\.next-ready\{\s*background:#f1f9f4/);
 assert.match(styles,/\.tl-stepbar button\.tl-step:disabled:not\(\.current\)\{/);
});

test('live rail test page and the selected candidate affordance do not include SOURCE footer',async()=>{
 const diagram=await readFile(new URL('../app/v2/TrainLiveDiagram.jsx',import.meta.url),'utf8');
 const page=await readFile(new URL('../app/train-lost-lab/page.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/SOURCE ·/);
 assert.doesNotMatch(ui,/tl-status-foot/);
 assert.match(ui,/tl-candidate-selected-badge/);
 assert.match(ui,/has-selection/);
 assert.match(styles,/tl-candidate-selected-badge/);
 assert.match(diagram,/trainDisplayPath\(line,station,next,focusedStation,focusedDestination\)/);
 assert.match(page,/TrainLostFinder/);
 assert.match(page,/trainDemo=1/);
 assert.match(page,/trainDemo=0/);
});
