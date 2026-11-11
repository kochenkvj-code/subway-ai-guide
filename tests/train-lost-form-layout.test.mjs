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

test('selected candidate affordance does not include SOURCE footer',async()=>{
 const diagram=await readFile(new URL('../app/v2/TrainLiveDiagram.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/SOURCE ·/);
 assert.doesNotMatch(ui,/tl-status-foot/);
 assert.match(ui,/tl-candidate-selected-badge/);
 assert.match(ui,/has-selection/);
 assert.match(styles,/tl-candidate-selected-badge/);
 assert.match(diagram,/trainDisplayPath\(line,station,next,focusedStation,focusedDestination\)/);
});

test('live map precedes ranked candidates, and redundant guidance and phone action are absent',async()=>{
 const diagram=await readFile(new URL('../app/v2/TrainLiveDiagram.jsx',import.meta.url),'utf8');
 const mapAt=ui.indexOf('className="tl-live-map-main"');
 const candidateAt=ui.indexOf("className={'tl-candidate-strip'");
 const selectionActionAt=ui.indexOf('className="tl-next-panel"');
 assert.ok(mapAt>=0&&candidateAt>mapAt&&selectionActionAt>candidateAt,'map → candidate cards → action');
 assert.match(ui,/className="tl-candidate-location"/);
 assert.doesNotMatch(ui,/className="tl-candidate-location-note"/);
 assert.match(ui,/candidateRankLabel\(index,lang\)/);
 assert.match(ui,/tl-candidate-rank/);
 assert.match(styles,/tl-candidate-rank-first/);
 assert.doesNotMatch(ui,/href="tel:15771234"/);
 assert.doesNotMatch(ui,/className="tl-call"/);
 assert.doesNotMatch(diagram,/className="tf-board-caption"/);
 assert.doesNotMatch(diagram,/현재 위치는 역 단위 추정이며 실제 탑승 열차는 미확정입니다/);
 assert.doesNotMatch(ui,/className="tl-candidate-hint"/);
 assert.doesNotMatch(ui,/className="tl-selection-summary"/);
 assert.doesNotMatch(diagram,/후보 열차 위치로|Go to candidates|onClick=\{toCandidates\}/);
 assert.match(diagram,/onClick=\{\(\)=>\{setFocusedTrain\(number\);onPick\(cand\);\}\}/);
 assert.match(styles,/\.tl-candidate-chip \.tl-candidate-rank/);
});

test('third-stage handoff emphasizes composing SMS to the verified operator number',async()=>{
 const finder=await readFile(new URL('../app/v2/TrainLostFinder.jsx',import.meta.url),'utf8');
 assert.match(ui,/className="tl-message-heading"/);
 assert.match(ui,/className="tl-copy-compact"/);
 assert.match(ui,/className="tl-sms-primary"/);
 assert.match(ui,/sms:'콜센터에 문자 접수하기'/);
 assert.match(ui,/smsTarget:'1577-1234'/);
 assert.match(ui,/className="tl-sms-primary-action"/);
 assert.match(ui,/className="tl-sms-primary-recipient"/);
 assert.match(ui,/문자 앱에서 내용을 확인한 뒤 직접 전송하세요\. 이 화면에서는 자동 발송되지 않습니다/);
 assert.doesNotMatch(ui,/문자 수신 여부는 확인되지/);
 assert.doesNotMatch(ui,/className="tl-send-options"/);
 assert.ok(ui.indexOf('className="tl-copy-compact"')<ui.indexOf('className="tl-message"'));
 assert.ok(ui.indexOf('className="tl-sms-primary"')>ui.indexOf('className="tl-message"'));
 assert.match(styles,/\.tf-redesign \.tl-copy-compact\{/);
 assert.match(styles,/\.tf-redesign \.tl-sms-primary\{/);
 assert.match(styles,/\.tf-redesign \.tl-sms-primary-action\{/);
 assert.match(styles,/\.tf-redesign \.tl-sms-primary-recipient\{/);
 assert.match(finder,/window\.location\.href='sms:15771234'/);
 assert.match(finder,/Opens a user-controlled SMS draft only/);
});

test('results emphasize choosing a train, with compact live refresh controls only',async()=>{
 const diagram=await readFile(new URL('../app/v2/TrainLiveDiagram.jsx',import.meta.url),'utf8');
 const results=ui.slice(ui.indexOf("{stage==='results'"),ui.indexOf("{stage==='handoff'"));
 assert.match(results,/\{v\.candidatePrompt\}/);
 assert.match(ui,/candidatePrompt:'탑승했던 것으로 생각되는 열차를 선택해 주세요'/);
 assert.doesNotMatch(results,/<strong>\{v\.candidateCount\} \{candidates\.length\}/);
 assert.doesNotMatch(results,/<span>\{u\.refresh\}<\/span>/);
 assert.doesNotMatch(diagram,/tf-board-dot"\/> \{t\.candidate\}/);
 assert.doesNotMatch(diagram,/\{selected&&<span>\{lang==='ko'\?'선택한 열차'/);
 assert.match(diagram,/className="tf-last-update"/);
 assert.match(diagram,/onClick=\{refresh\}/);
 assert.match(styles,/\.tl-live-map-main \.tf-board-summary\{/);
});
test('handoff removes repeated route/time and recent position and uses readable two-line notices',()=>{
 const results=ui.slice(ui.indexOf("{stage==='results'"),ui.indexOf("{stage==='handoff'"));
 const handoff=ui.slice(ui.indexOf("{stage==='handoff'"));
 assert.match(results,/className="tl-search-context"/);
 assert.doesNotMatch(handoff,/className="tl-search-context"/);
 assert.doesNotMatch(handoff,/\{chosen&&current&&<p className="tl-note">/);
 assert.match(handoff,/className="tl-handoff-notices"/);
 assert.match(handoff,/tl-handoff-notice-icon/);
 assert.match(styles,/\.tl-handoff-notices\{/);
 assert.match(ui,/실제 열차 수배와 관제 협조는 정보를 전달받은 역 또는 콜센터가 판단하고 진행합니다/);
});

test('map title and train-picking hint share one row with update and refresh aligned right',async()=>{
 const diagram=await readFile(new URL('../app/v2/TrainLiveDiagram.jsx',import.meta.url),'utf8');
 const results=ui.slice(ui.indexOf("{stage==='results'"),ui.indexOf("{stage==='handoff'"));
 assert.match(results,/sectionTitle=\{v\.mapTitle\} instruction=\{v\.candidatePrompt\}/);
 assert.doesNotMatch(results,/className="tl-live-map-title"/);
 assert.doesNotMatch(results,/className="tl-live-candidate-header"/);
 assert.match(diagram,/tf-board-summary tf-map-headline-row/);
 assert.match(diagram,/className="tf-map-heading"/);
 assert.match(diagram,/className="tf-map-instruction"/);
 assert.match(diagram,/className="tf-map-updated"/);
 assert.ok(diagram.indexOf('className="tf-map-heading"')<diagram.indexOf('className="tf-map-updated"'));
 assert.match(styles,/\.tf-map-updated\{/);
 assert.match(styles,/\.tf-board-summary\.tf-map-headline-row\{/);
});

test('warm train-confirmation copy distinguishes found candidates from pending and empty states',()=>{
 assert.match(ui,/heroFound:'열차 후보를 찾았어요!'/);
 assert.match(ui,/heroOut:'어떤 열차였는지 찾아볼까요\?'/);
 assert.match(ui,/mapTitle:'어떤 열차였는지 살펴볼까요\?'/);
 assert.match(ui,/searched&&!busy&&candidates\.length>0\?u\.heroFound:u\.heroOut/);
});
test('refresh icon remains accessible, small and aligned beside last update',async()=>{
 const diagram=await readFile(new URL('../app/v2/TrainLiveDiagram.jsx',import.meta.url),'utf8');
 assert.match(diagram,/className="tf-refresh-icon" onClick=\{refresh\}/);
 assert.match(diagram,/aria-label=\{refreshing\?t\.pending:t\.manual\}/);
 assert.match(diagram,/title=\{refreshing\?t\.pending:t\.manual\}/);
 assert.match(diagram,/className="tf-last-update"/);
 assert.match(styles,/button\.tf-refresh-icon\{/);
 assert.match(styles,/width:32px;height:32px/);
});
