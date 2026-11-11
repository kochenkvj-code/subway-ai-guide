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

test('four door numbers stay in one inline row beside the door-number label',()=>{
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

test('quick-time buttons sit above the slider so dragging never covers the shortcuts',()=>{
 const start=ui.indexOf('className="tl-time-meter"');
 const header=ui.indexOf('className="tl-time-topline"',start);
 const choices=ui.indexOf('className="tl-times"',header);
 const slider=ui.indexOf('className="tl-time-slider"',choices);
 const end=ui.indexOf('</div>',slider);
 assert.ok(start!==-1&&header>start&&choices>header&&slider>choices&&end>slider,
  'toolbar → quick choices → range slider belong in one time meter');
 assert.match(styles,/\.tl-time-field \.tl-time-meter\{\s*display:flex;flex-direction:column;/);
 assert.match(styles,/\.tl-time-field \.tl-time-slider\{\s*margin:14px 0 6px/);
});

test('exactly the selected train-lost stage receives the strong active styling',()=>{
 assert.match(ui,/className=\{'tl-step'\+\(showTrip\?' tl-step-with-trip':''\)\+\(i\+1===stageNumber\?' current'/);
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
 assert.match(ui,/tl-candidate-check/);
 assert.match(ui,/has-selection/);
 assert.match(styles,/tl-candidate-check/);
 assert.doesNotMatch(ui,/tl-candidate-selected-badge|selectedLabel/);
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
 assert.match(ui,/버튼을 누르면 콜센터 번호와 접수 내용을 담은 문자 작성 화면이 열립니다/);
 assert.match(ui,/문자 앱에서 전송을 눌러주세요/);
 assert.match(ui,/본문이 자동 입력되지 않으면/);
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
 assert.match(results,/instruction=\{candidates\.length\?v\.mapInstruction:''\}/);
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
 assert.doesNotMatch(results,/className="tl-search-context/);
 assert.match(ui,/className="tl-step-trip-detail"/);
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
 assert.match(results,/sectionTitle=\{v\.mapTitle\} instruction=\{candidates\.length\?v\.mapInstruction:''\}/);
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
 assert.match(ui,/heroFound:'열차 후보를 찾았어요'/);
 assert.match(ui,/heroOut:'열차 정보를 확인하고 있어요'/);
 assert.match(ui,/heroEmpty:'열차 후보를 찾지 못했어요'/);
 assert.match(ui,/mapTitle:'실시간 열차 위치'/);
 assert.match(ui,/resultsTitle=!searched\|\|busy\?u\.heroOut:candidates\.length\?u\.heroFound:u\.heroEmpty/);
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

test('preview auto-selects ranked first candidate and protects subsequent user choice',async()=>{
 const model=await readFile(new URL('../app/v2/TrainLostFinder.jsx',import.meta.url),'utf8');
 const page=await readFile(new URL('../app/train-lost-lab/page.jsx',import.meta.url),'utf8');
 assert.match(model,/function selectTopCandidate\(list,positions\)/);
 assert.match(model,/setChosen\(first\)/);
 assert.match(model,/selectTopCandidate\(result\.candidates,sample\)/);
 assert.match(model,/selectTopCandidate\(result\.candidates,enriched\)/);
 assert.match(model,/setChosen\(prev=>\{/);
 assert.match(model,/result\.candidates\.find\(c=>compareNo\(c\.number\)===compareNo\(prev\.number\)\)\|\|prev/);
 assert.match(model,/if\(previewPrefill\)\{window\.alert/);
 assert.match(page,/previewPrefill=\{true\}/);
 assert.match(page,/trainDemo=1/);
 assert.match(page,/href=\{url\('ko',mode\)\}/);
 assert.match(page,/href=\{url\('en',mode\)\}/);
});
test('all three stages share concise headers, with third stage review heading and detailed SMS instruction',()=>{
 assert.match(ui,/heroIn:'분실 정보를 알려주세요'/);
 assert.match(ui,/subtitle:'하차역·시각과 분실 물품을 입력해 주세요\.'/);
 assert.match(ui,/resultSubtitleTop:'선택된 열차가 맞는지 확인해 주세요\.'/);
 assert.match(ui,/handoffReview:'접수 내용 확인'/);
 assert.match(ui,/\{u\.handoffReview\}/);
 assert.doesNotMatch(ui,/<h3>\{u\.handoff\}<\/h3>/);
 assert.match(ui,/smsFallback:'일부 기기에서 본문이 자동 입력되지 않으면/);
 assert.match(styles,/\.tl-hero h2\{/);
 assert.match(styles,/\.tl-hero p\{/);
});
test('English compact route and candidate selection are never forced into clipped badges',()=>{
 assert.match(ui,/className="tl-step-trip-detail"/);
 assert.match(ui,/className="tl-step-trip-clock"/);
 assert.doesNotMatch(ui,/className="tl-step-trip-destination"/);
 assert.match(ui,/className="tl-candidate-identity"/);
 assert.match(styles,/\.tl-stepbar \.tl-step-trip-clock\{/);
 assert.match(styles,/\.tl-candidate-identity\{/);
 assert.match(styles,/\.tl-candidate-chip \.tl-candidate-check\{/);
});

test('first-stage station and line controls share a single horizontal row',()=>{
 assert.equal((ui.match(/tl-station-column tl-station-inline-field/g)||[]).length,2);
 assert.match(styles,/\.tl-station-column\.tl-station-inline-field\{/);
 assert.match(styles,/\.tl-station-layout\{\s*display:grid;grid-template-columns:minmax\(0,1\.65fr\)/);
});
test('prepared SMS combines route details, removes raw API timestamp, and expands fully',async()=>{
 const model=await readFile(new URL('../app/v2/TrainLostFinder.jsx',import.meta.url),'utf8');
 assert.match(model,/z\.station\+': '/);
 assert.match(model,/z\.direction\+': '\+next/);
 assert.match(model,/z\.station\+': '\+selection\.line\+z\.lineUnit/);
 assert.doesNotMatch(model,/current\.station\+z\.stationUnit\+' \('\+current\.receivedAt/);
 assert.match(model,/z\.item\+': '\+thing\.trim\(\)\+\(place\?/);
 assert.match(styles,/\.tl-message\{\s*max-height:none;height:auto;min-height:0;overflow:visible/);
});

test('station picker keeps equal visual hierarchy and has a compact guided station search',()=>{
 assert.match(ui,/className="tl-picker tl-station-search-panel"/);
 assert.match(ui,/className="tl-picker-search"/);
 assert.match(ui,/className="tl-picker-heading"/);
 assert.match(ui,/className="tl-picker-line"/);
 assert.match(ui,/className="tl-picker-arrow"/);
 assert.match(styles,/\.tl-station-inline-field>\.tl-label\{/);
 assert.match(styles,/\.tl-station-value\{/);
 assert.match(styles,/\.tl-picker-search\{/);
});
test('SMS request separates direction from alighting station and uses an actionable, non-accusatory closing',async()=>{
 const model=await readFile(new URL('../app/v2/TrainLostFinder.jsx',import.meta.url),'utf8');
 assert.match(model,/z\.station\+': '\+selection\.line\+z\.lineUnit/);
 assert.match(model,/z\.direction\+': '\+next\+z\.stationUnit/);
 assert.match(model,/입력하신 하차 정보와 실시간 열차 위치를 바탕으로 추린 수배 후보입니다/);
 assert.doesNotMatch(model,/실제 탑승 열차인지 확인이 필요합니다/);
 assert.doesNotMatch(model,/current\.receivedAt\+\)/);
});

test('selected train uses only an accessible checkmark and compact card width',()=>{
 assert.match(ui,/aria-pressed=\{selected\}/);
 assert.match(ui,/selected&&<span className="tl-candidate-check" aria-hidden="true">✓<\/span>/);
 assert.doesNotMatch(ui,/selectedLabel|tl-candidate-selected-badge/);
 assert.match(styles,/\.tl-candidate-strip \.tl-candidate-chip\{/);
 assert.match(styles,/flex:0 0 132px/);
});
test('three equal-width steps retain only alighting time in compact editable first tile',()=>{
 assert.match(ui,/const showTrip=stage==='results'&&i===0/);
 assert.match(ui,/const tripText=v\.time\+' '\+displayTime/);
 assert.match(ui,/className="tl-step-heading"/);
 assert.match(ui,/className="tl-step-trip-detail"/);
 assert.match(ui,/className="tl-step-trip-clock"/);
 assert.doesNotMatch(ui,/className="tl-step-trip-line"/);
 assert.doesNotMatch(ui,/className="tl-step-trip-origin"/);
 assert.doesNotMatch(ui,/className="tl-step-trip-destination"/);
 assert.match(ui,/aria-label=\{showTrip\?label\+' · '\+tripText\+' · '\+u\.change:undefined\}/);
 assert.doesNotMatch(ui,/className="tl-stepbar-trip"/);
 assert.doesNotMatch(ui,/className="tl-search-context tl-search-context-compact"/);
 assert.match(styles,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(styles,/height:52px;min-height:52px;max-height:52px/);
 assert.match(styles,/\.tl-stepbar \.tl-step-trip-detail\{\s*display:flex;align-items:center;justify-content:center/);
});
test('car-door confirmation duplicates are removed; labels are aligned and door buttons inline',()=>{
 assert.doesNotMatch(ui,/className="tl-chosen-car"/);
 assert.match(ui,/className="tl-door-block"/);
 assert.match(styles,/\.tl-car-door-field \.tl-door-block\{\s*display:flex;align-items:center/);
 assert.match(styles,/\.tl-car-door-field \.tl-door-options\{\s*flex:1 1 auto;min-width:0;/);
 assert.match(styles,/\.tl-item-place-row \.tl-label,\s*\.tf-redesign\.tl-three-stage \.tl-car-door-field>\.tl-label/);
});

test('timetable footer avoids API and provider-format jargon in four languages',async()=>{
 const timetable=await readFile(new URL('../app/v2/TrainTimetable.jsx',import.meta.url),'utf8');
 const footerStart=timetable.indexOf("note:'서울교통공사 제공 예정 운행시각");
 assert.ok(footerStart>0);
 assert.match(timetable,/week:'주말·공휴일에는 운행시각이 다를 수 있으니 이용 전 확인해 주세요\.'/);
 assert.doesNotMatch(timetable,/토요일·공휴일 구분은 이 API에 별도로 없습니다/);
 assert.doesNotMatch(timetable,/The provider groups weekend trains together/);
 assert.doesNotMatch(timetable,/提供元の週末時刻表を使用します/);
 assert.doesNotMatch(timetable,/运营方统一提供周末时刻表/);
});
