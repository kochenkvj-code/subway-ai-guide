'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {officialStationMatches} from '../lib/officialStations';
import {stationName,lineName} from '../lib/stationNameI18n';
import {stationNeighbors,supportsStation,findLiveCandidates,followStops,futureStops,expectedLiveDirection} from '../lib/train-lost';
import './train-lost.css';
import TrainLiveDiagram from './TrainLiveDiagram';

const labels={
 ko:{head:'열차 내 유실물 찾기',sub:'하차한 열차를 추정하고 실시간 위치를 확인합니다.',station:'하차역',change:'다른 역 선택',search:'역명 검색',line:'호선',toward:'열차가 향한 다음 역',towardHint:'하차한 열차가 어느 쪽으로 떠났나요?',time:'하차 시각',date:'하차 날짜',thing:'분실 물품',thingExample:'예: 검은색 가방',car:'탑승 칸·출입문',carExample:'예: 4-2',lookup:'열차 후보 찾기',looking:'시간표와 실시간 정보를 대조 중…',none:'조건에 맞는 열차 후보가 없습니다. 시간을 다시 확인해 주세요.',candidates:'가능한 열차',scheduled:'시간표',live:'실시간 열차번호 일치 · 위치 확인',onlySchedule:'시간표로 추정 · 실시간 미확인',directionUnknown:'실시간 방향 검증 불가: 두 방향의 후보가 함께 표시될 수 있습니다.',uncertain:'후보 열차가 여러 대면 정확히 확인한 후 선택하세요. 시간표만으로 열차를 확정할 수 없습니다.',choose:'이 열차 추적',selected:'선택한 열차',update:'위치 새로고침',position:'현재 확인 위치',absent:'실시간 위치를 확인할 수 없습니다.',forth:'연락 가능성을 확인할 후속 역',forthNote:'일반열차·분기 없는 구간 기준입니다. 실제 정차 및 통화 가능 여부를 확인하세요.',noForth:'급행 정차역 또는 지선 경로가 확인되지 않아 특정 역을 추천하지 않습니다.',sms:'콜센터 문자 작성',copy:'문구 복사',call:'1577-1234 전화',smsNote:'문자 앱에서 내용을 확인하고 직접 발송하세요. 기기별로 본문이 채워지지 않을 수 있습니다.',openSms:'1577-1234 문자 앱 열기',again:'다시 검색',guide:'열차번호는 추정값이며, 조회된 위치가 해당 승객의 실제 탑승열차를 보장하지 않습니다.',failure:'정보를 불러오지 못했습니다. 기존 전화 상담을 이용하세요.',emptyQuery:'하차역을 먼저 선택하세요.',dateNote:'공휴일·운행 변경·막차 시간표는 실제와 다를 수 있습니다.',branch:'분기역에서는 같은 방향이라도 경로가 나뉠 수 있습니다.',noApi:'실시간 위치가 없을 경우 시간표 후보만 보여줍니다.',pick:'선택',arrivalGap:'시각 차이'},
 en:{head:'Find an item left on a train',sub:'Find possible trains and check their live locations.',station:'Station where you got off',change:'Change station',search:'Search stations',line:'Line',toward:'Next station the train headed toward',towardHint:'Which way did your train go?',time:'Time you got off',date:'Date',thing:'Lost item',thingExample:'e.g. black bag',car:'Car / door',carExample:'e.g. 4-2',lookup:'Find candidate trains',looking:'Checking timetables and live positions…',none:'No candidate trains. Check the time and station.',candidates:'Possible trains',scheduled:'Scheduled time',live:'Train number matched · live location',onlySchedule:'Timetable estimate · not live verified',directionUnknown:'Direction could not be confirmed; trains from both directions may appear.',uncertain:'Please identify your train. Timetables alone cannot confirm the actual train.',choose:'Track this train',selected:'Selected train',update:'Refresh location',position:'Last reported location',absent:'No verified live position available.',forth:'Potential downstream stations',forthNote:'Local trains and unbranched tracks only. Confirm stopping patterns.',noForth:'Station suggestions unavailable due to express service or branching uncertainty.',sms:'Prepare an SMS for the call center',copy:'Copy message',call:'Call 1577-1234',smsNote:'Review and send from your own phone. Some devices may not prefill the message.',openSms:'Open SMS to 1577-1234',again:'Search again',guide:'These are estimated candidates, not proof of which train you rode.',failure:'Could not load the data. Please call the customer center.',emptyQuery:'Please choose a station.',dateNote:'Public holidays, delays and late-night schedules may differ.',branch:'Train routes may branch even in the same direction.',noApi:'Without live data only the scheduled candidates are shown.',pick:'Choose',arrivalGap:'Time difference'},
 ja:{head:'車内の忘れ物を探す',sub:'下車した列車の候補と現在位置を調べます。',station:'下車駅',change:'駅を変更',search:'駅を検索',line:'路線',toward:'列車が進んだ次の駅',towardHint:'列車はどちらへ向かいましたか？',time:'下車時刻',date:'下車日',thing:'忘れ物',thingExample:'例：黒いかばん',car:'車両・ドア',carExample:'例：4-2',lookup:'列車候補を検索',looking:'時刻表と現在位置を確認中…',none:'候補がありません。条件を確認してください。',candidates:'列車候補',scheduled:'予定時刻',live:'列車番号一致・現在位置確認',onlySchedule:'時刻表による推定・位置未確認',directionUnknown:'方向を検証できません。両方向の候補が表示されることがあります。',uncertain:'複数候補がある場合はご自身で確認してください。',choose:'この列車を追跡',selected:'選択した列車',update:'位置更新',position:'最新の位置',absent:'現在位置を確認できません。',forth:'連絡候補駅',forthNote:'普通列車・分岐なしの区間に限ります。',noForth:'急行・分岐などのため候補駅を提示できません。',sms:'コールセンターへSMS',copy:'文面をコピー',call:'1577-1234へ電話',smsNote:'SMSアプリで確認して送信してください。本文が自動入力されない場合があります。',openSms:'SMSアプリを開く',again:'再検索',guide:'列車番号は推定であり、乗車列車の確定ではありません。',failure:'情報取得に失敗しました。電話をご利用ください。',emptyQuery:'駅を選択してください。',dateNote:'祝日や遅延時のダイヤは異なることがあります。',branch:'同じ方向でも支線に分かれることがあります。',noApi:'リアルタイム情報がない場合は時刻表のみ表示します。',pick:'選択',arrivalGap:'時間差'},
 zh:{head:'查找遗落在列车上的物品',sub:'推测乘坐列车并查看实时位置。',station:'下车站',change:'更换车站',search:'搜索车站',line:'线路',toward:'列车驶往的下一站',towardHint:'列车朝哪个方向离开？',time:'下车时间',date:'下车日期',thing:'遗失物品',thingExample:'例如：黑色背包',car:'车厢/车门',carExample:'例如：4-2',lookup:'查找候选列车',looking:'正在核对时刻表和实时位置…',none:'没有符合条件的列车，请检查时间。',candidates:'候选列车',scheduled:'时刻表',live:'车次匹配·实时位置已核对',onlySchedule:'仅时刻表推测·未实时确认',directionUnknown:'无法确认方向，可能显示两个方向的候选列车。',uncertain:'请自行确认候选车次，时刻表不能保证乘坐的列车。',choose:'追踪此列车',selected:'已选列车',update:'更新位置',position:'最近报告位置',absent:'无法核实实时位置。',forth:'可联系的后续车站',forthNote:'仅适用于普通列车及无分岔路段，请核实停站。',noForth:'因快车或支线不确定，暂不推荐车站。',sms:'向客服发送短信',copy:'复制短信',call:'拨打1577-1234',smsNote:'请在短信应用中确认后自行发送，部分设备不会自动填入正文。',openSms:'打开短信应用',again:'重新搜索',guide:'列车号码仅为推测，不保证为您乘坐的列车。',failure:'无法获取信息，请拨打客服。',emptyQuery:'请先选择车站。',dateNote:'节假日、延误及末班车时刻可能不同。',branch:'即使方向相同，线路也可能分岔。',noApi:'没有实时数据时仅提供时刻表候选。',pick:'选择',arrivalGap:'时间差'}
};
const liveWords={
ko:{looking:'실시간 열차 위치·도착정보 확인 중…',none:'조건에 맞는 실시간 열차를 찾지 못했어요. 하차시각을 확인해 주세요.',live:'실시간 위치·후속역 도착정보 일치',onlySchedule:'실시간 위치 후보 · 진행 방향 미확인',directionUnknown:'일부 후보는 방향을 추가 확인해야 해요.',uncertain:'열차의 현재 위치만으로 이전에 하차역을 통과했다고 확정할 수 없습니다. 열차번호를 신중히 확인해 주세요.',scheduled:'최근 확인 위치',dateNote:'하차 후 30분 이내 검색 가능 · 정거장당 약 2분은 임시 추정값이에요.',noApi:'시간표 대신 실시간 위치·도착정보만 사용합니다.',arrivalGap:'하차역부터',fastTime:'하차한 지',fastMin:'분',expressText:'급행 경로 미검증'},
en:{looking:'Checking live train positions…',none:'No train matches live-position evidence. Please check the alighting time.',live:'Live position corroborated by downstream arrival',onlySchedule:'Live position candidate · direction unverified',directionUnknown:'Some candidates still lack direction confirmation.',uncertain:'A current location alone cannot prove the train previously passed your station.',scheduled:'Last reported station',dateNote:'Search within 30 minutes; ~2 minutes per stop is a preliminary estimate.',noApi:'Uses only real-time train positions and arrival data.',arrivalGap:'Stops since alighting',fastTime:'Alighted',fastMin:'min ago',expressText:'Express route unverified'},
ja:{looking:'リアルタイム位置を確認中…',none:'候補が見つかりません。下車時刻をご確認ください。',live:'現在位置と後続駅到着情報が一致',onlySchedule:'位置情報による候補・方向未確認',directionUnknown:'一部の進行方向は未確認です。',uncertain:'現在位置だけでは以前の通過駅を確定できません。',scheduled:'最新確認駅',dateNote:'下車後30分以内が対象。駅間約2分は暫定値です。',noApi:'時刻表ではなく現在位置から推定します。',arrivalGap:'下車駅から',fastTime:'下車から',fastMin:'分',expressText:'急行経路未確認'},
zh:{looking:'正在核对实时列车位置…',none:'没有匹配的实时列车，请核对下车时间。',live:'实时位置与后续到站数据吻合',onlySchedule:'实时位置候选·方向未核实',directionUnknown:'部分候选方向待确认。',uncertain:'仅凭当前位置不能证明列车此前经过下车站。',scheduled:'最近报告车站',dateNote:'仅支持下车后30分钟内查询；每站约2分钟为初步估计。',noApi:'不使用时刻表，仅依靠实时数据。',arrivalGap:'下车站之后',fastTime:'下车前',fastMin:'分钟',expressText:'快车线路待核实'}
};

const korea=(minutesAgo=0)=>{

 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(Date.now()-minutesAgo*60000));
 const m=Object.fromEntries(p.map(x=>[x.type,x.value]));return {date:m.year+'-'+m.month+'-'+m.day,time:m.hour+':'+m.minute};
};
const fmt=(name,lang)=>stationName(name,lang)||name;
const compareNo=x=>String(x||'').replace(/^0+(?=\d)/,'');
function kstAlightDateForTime(time){
 const today=korea().date;
 const todayMs=Date.parse(today+'T'+time+':00+09:00');
 const now=Date.now();
 if(todayMs>now+60000){
  const yesterday=korea(1440).date;
  const yesterdayMs=Date.parse(yesterday+'T'+time+':00+09:00');
  if(now-yesterdayMs>=-120000&&now-yesterdayMs<=30*60000)return yesterday;
 }
 return today;
}
function validLocation(candidate,p,selection,next,when){
 if(!candidate||!p||compareNo(p.trainNo)!==compareNo(candidate.number))return false;
 const elapsed=Date.now()-Date.parse(when.date+'T'+when.time+':00+09:00');
 if(!Number.isFinite(elapsed)||elapsed< -120000||elapsed>30*60000)return false;
 if(String(candidate.live.direction)!==String(p.direction))return false;
 if(String(p.direction)!==expectedLiveDirection(selection.line,selection.name,next))return false;
 const route=followStops(selection.line,selection.name,next,38);
 if(![selection.name,...route.stops].includes(p.station))return false;
 const age=Date.now()-Date.parse(p.receivedAt);
 return age>=-60000&&age<=120000;
}
export default function TrainLostFinder({lang='ko',active=true,defaultStation='종로5가',defaultLine='1'}){
 const t={...(labels[lang]||labels.ko),...(liveWords[lang]||liveWords.ko)};
 const initial=()=>supportsStation(defaultLine,defaultStation)?{name:defaultStation,line:defaultLine}:{name:'종로5가',line:'1'};
 const [selection,setSelection]=useState(initial);
 const [demoMode,setDemoMode]=useState(false);
 useEffect(()=>{
   // A separate installation may link directly to its station; validate against the line graph.
   const p=new URLSearchParams(window.location.search);
   const station=(p.get('station')||'').trim().replace(/역$/,'');
   const line=p.get('line')||'';
   if(/^[1-9]$/.test(line)&&supportsStation(line,station))setSelection({name:station,line});
   setDemoMode(p.get('trainDemo')==='1');
 },[]);
 const [query,setQuery]=useState(''),[editing,setEditing]=useState(false),[next,setNext]=useState('');
 const [when,setWhen]=useState(()=>korea(5));
 const [quickMin,setQuickMin]=useState(5);
 const requestId=useRef(0);
 const [livePositions,setLivePositions]=useState([]),[liveFetchedAt,setLiveFetchedAt]=useState(null);
 const [destinationHints,setDestinationHints]=useState({});
 const [thing,setThing]=useState(''),[car,setCar]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[candidates,setCandidates]=useState([]);
 const [chosen,setChosen]=useState(null),[current,setCurrent]=useState(null),[liveInfo,setLiveInfo]=useState(''),[directionWarning,setDirectionWarning]=useState(false);
 const [copyStatus,setCopyStatus]=useState(false),[searched,setSearched]=useState(false),[lookupStats,setLookupStats]=useState(null);
 const neighbors=useMemo(()=>stationNeighbors(selection.line,selection.name),[selection.name,selection.line]);
 const requiredDirection=expectedLiveDirection(selection.line,selection.name,next);
 const lines=useMemo(()=>Array.from({length:9},(_,i)=>String(i+1)).filter(line=>supportsStation(line,selection.name)),[selection.name]);
 const matches=useMemo(()=>query.trim()?officialStationMatches(query,lang,15).flatMap(s=>(s.lines||[s.line]).map(l=>({name:s.ko.replace(/역$/,''),line:String(Number(l.match(/(\d+)호선/)?.[1]||0)),display:s[lang]||s.ko})).filter(s=>supportsStation(s.line,s.name))):[],[query,lang]);
 useEffect(()=>{if(next&&!neighbors.includes(next))setNext('');},[neighbors,next]);

 function resetMatches(){requestId.current+=1;setBusy(false);setError('');setChosen(null);setCandidates([]);setCurrent(null);setSearched(false);setCopyStatus(false);setLivePositions([]);setLiveFetchedAt(null);setDestinationHints({});}
 function chooseStation(s){setSelection({name:s.name,line:s.line});setNext('');setEditing(false);setQuery('');resetMatches();setError('');}
 async function lookup(){
   const token=++requestId.current;
   const isCurrent=()=>token===requestId.current;
   if(!supportsStation(selection.line,selection.name)||!next||!when.time){setError(t.emptyQuery);return;}
   const elapsed=Date.now()-Date.parse(when.date+'T'+when.time+':00+09:00');
   if(!Number.isFinite(elapsed)||elapsed< -120000||elapsed>30*60000){
     setError('하차 후 30분 이내의 최근 열차만 실시간 위치로 검색할 수 있어요.');
     if(isCurrent()){setCandidates([]);setChosen(null);setSearched(true);}return;
   }
   setBusy(true);setSearched(true);setError('');setCandidates([]);setChosen(null);setCurrent(null);setDirectionWarning(false);setLookupStats(null);
   if(demoMode){
     // Explicit visual-only preview for branch URLs without live API credentials.
     // Never mix synthetic train numbers with actual lost property reports.
     const now=Date.now();
     const path=followStops(selection.line,selection.name,next,18).stops;
     const direction=expectedLiveDirection(selection.line,selection.name,next);
     const opposite=direction==='0'?'1':'0';
     const make=(trainNo,st,dir)=>({trainNo,line:selection.line,station:st,direction:dir,
       destination:'시연',express:false,receivedAt:new Date(now).toISOString()});
     const sample=[
       make('D001',path[1]||next,direction),
       make('D002',path[2]||next,direction),
       make('D003',path[4]||next,direction),
       make('D004',path[1]||next,opposite),
       make('D005',selection.name,opposite)
     ];
     const result=findLiveCandidates(sample,{
       date:when.date,time:when.time,line:selection.line,station:selection.name,next,now
     });
     if(!isCurrent())return;
     setLivePositions(sample);setLiveFetchedAt(new Date(now).toISOString());
     setCandidates(result.candidates);setDirectionWarning(false);setBusy(false);
     return;
   }
   const getJSON=async url=>{try{const r=await fetch(url,{cache:'no-store'});return r.ok?await r.json():null;}catch{return null;}};
   try{
     const route=followStops(selection.line,selection.name,next,8).stops;
     const stations=[selection.name,...route.slice(1,7)];
     const [position,...arrivals]=await Promise.all([
       getJSON('/api/v2/train-lost/position?line='+selection.line),
       ...stations.map(st=>getJSON('/api/v2/train-lost/arrival?line='+selection.line+'&station='+encodeURIComponent(st)))
     ]);
     if(!isCurrent())return;
     if(!position?.ok)throw Error(t.failure+' (LIVE API)');
     setLookupStats(position.diagnostics||{usableRows:position.positions?.length||0});
     const evidence=arrivals.flatMap((result,i)=>(result?.evidence||[]).map(x=>({
       ...x,routeIndex:stations[i]===selection.name?0:route.indexOf(stations[i])+1
     })));
     // Match a missing terminus only using the same train number AND live direction.
     const hints={};
     for(const row of evidence){
       if(!row.trainNo||!row.destination||!['0','1'].includes(String(row.directionCode)))continue;
       hints[compareNo(row.trainNo)+'/'+row.directionCode]=row.destination;
     }
     setDestinationHints(hints);
     const enriched=(position.positions||[]).map(p=>!p.destination&&hints[compareNo(p.trainNo)+'/'+p.direction]?
       {...p,destination:hints[compareNo(p.trainNo)+'/'+p.direction]}:p);
     setLivePositions(enriched);setLiveFetchedAt(position.fetchedAt);
     const result=findLiveCandidates(enriched,{
       date:when.date,time:when.time,line:selection.line,station:selection.name,next,arrivalEvidence:evidence
     });
     setCandidates(result.candidates);
     setDirectionWarning(result.candidates.some(x=>!x.corroborated));
   }catch(ex){if(isCurrent())setError(ex.message||t.failure);}finally{if(isCurrent())setBusy(false);}
 }
 // Single-screen, auto-search: no submit button or second page.
 // Debounce rapid choices and invalidate any out-of-order network responses.
 useEffect(()=>{
   if(!active||editing||!next||!when.time||requiredDirection===null){
     requestId.current+=1;
     setBusy(false);
     return;
   }
   const timer=setTimeout(()=>lookup(),320);
   return ()=>{clearTimeout(timer);requestId.current+=1;};
 },[active,editing,selection.name,selection.line,next,when.date,when.time,demoMode]);
 function pick(candidate){
   setChosen(candidate);
   const found=livePositions.find(p=>compareNo(p.trainNo)===compareNo(candidate.number)&&String(p.direction)===String(requiredDirection));
   setCurrent(found||candidate.live||null);
 }
 function onLiveSnapshot(nextPositions,at){
   const enriched=nextPositions.map(p=>!p.destination&&destinationHints[compareNo(p.trainNo)+'/'+p.direction]?
     {...p,destination:destinationHints[compareNo(p.trainNo)+'/'+p.direction]}:p);
   setLivePositions(enriched);
   setLiveFetchedAt(at);
   if(chosen){
     const matched=enriched.find(p=>compareNo(p.trainNo)===compareNo(chosen.number)&&String(p.direction)===String(requiredDirection));
     setCurrent(matched||null);
   }
 }
 const where=current?.station||'';
 const canRecommend=Boolean(chosen&&current&&!current.express&&!chosen.express&&chosen.corroborated&&String(current.direction)===requiredDirection);
 const recommended=canRecommend?futureStops(selection.line,selection.name,next,where):{stations:[],reason:'NO_POSITION'};
 const message=chosen?'[서울교통공사 열차 내 유실물 수배 요청]\n노선: '+selection.line+'호선\n하차역: '+selection.name+'역\n하차일시: '+when.date+' '+when.time+'경\n열차 진행 방향: '+next+'역 방면\n열차번호: '+chosen.number+' (실시간 위치 기반 추정·미확정)\n현재 확인 위치: '+(current?current.station+'역 ('+current.receivedAt+')':'실시간 확인 불가')+'\n탑승 위치: '+(car.trim()||'미입력')+'\n분실물: '+(thing.trim()||'미입력')+'\n\n해당 열차번호는 실시간 위치 기반 추정이며 실제 탑승열차로 확정되지 않았습니다. 해당 열차 유실물 수배를 요청드립니다.':'';
 function sms(){const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);window.location.href='sms:15771234'+(ios?'&':'?')+'body='+encodeURIComponent(message);}
 async function copyMessage(){try{await navigator.clipboard.writeText(message);setCopyStatus(true);}catch{setCopyStatus(false);}}
 return <div className="tf-root tf-onepage">
   <header className="tf-compact-header">
     <h2>{t.head}</h2>
     <span className="tf-mode-pill">{lang==='ko'?'실시간 · 2분/역 추정':lang==='en'?'Live · ~2 min/stop':lang==='ja'?'リアルタイム・約2分/駅':'实时 · 约2分/站'}</span>
   </header>
   {demoMode&&<p className="tf-warning" role="status">DEMO · {lang==='ko'?'가상 열차 시연 화면 · 실제 수배 불가':lang==='en'?'Fictional trains · not for actual reports':lang==='ja'?'架空の列車によるデモです':'虚构列车演示'}</p>}
   <form className="tf-form tf-auto-form" onSubmit={e=>e.preventDefault()}>
     <div className="tf-compact-station tf-field">
       <label>{t.station}</label>
       <div className="tf-selected"><strong>{fmt(selection.name,lang)}</strong><span>{lineName(selection.line+'호선',lang)}</span>
         <button type="button" onClick={()=>setEditing(!editing)}>{editing?(lang==='ko'?'닫기':'Close'):t.change}</button>
       </div>
       {editing&&<div className="tf-station-picker">
         <input type="search" value={query} placeholder={t.search} onChange={e=>setQuery(e.target.value)} autoComplete="off" aria-label={t.search}/>
         {matches.length>0&&<div className="tf-matches">{matches.map(st=><button type="button" key={st.name+st.line} onClick={()=>chooseStation(st)}>{st.display} · {lineName(st.line+'호선',lang)}</button>)}</div>}
       </div>}
     </div>
     {lines.length>1&&<div className="tf-field tf-line-field"><label>{t.line}</label>
       <select value={selection.line} onChange={e=>chooseStation({name:selection.name,line:e.target.value})}>
         {lines.map(line=><option value={line} key={line}>{lineName(line+'호선',lang)}</option>)}
       </select>
     </div>}
     <div className="tf-field tf-direction-field">
       <label>{lang==='ko'?'열차 진행 방향':t.toward}</label>
       <div className="tf-options tf-direction-options">{neighbors.map((st,index)=><button type="button" key={st}
         className={next===st?'chosen':''} aria-pressed={next===st}
         onClick={()=>{if(next!==st){setNext(st);resetMatches();}}}>
         {index===0&&neighbors.length>1?'← ':''}{fmt(st,lang)}{index===0&&neighbors.length>1?'':index>1?' ↗':' →'}
       </button>)}</div>
       {next&&requiredDirection===null&&<p className="tf-warning">{lang==='ko'?'이 방향의 실시간 운행 코드가 확인되지 않았어요.':lang==='en'?'Real-time direction unavailable.':'進行方向を確認できません。':'无法确认该方向。'}</p>}
       {neighbors.length>2&&<p className="tf-mini-help">{t.branch}</p>}
     </div>
     <div className="tf-field tf-time-field">
       <label>{t.time}</label>
       <div className="tf-time-controls">
         <div className="tf-quick-times"><div>{[3,5,10,15].map(min=><button key={min} type="button"
           className={quickMin===min?'chosen':''} aria-pressed={quickMin===min}
           onClick={()=>{setQuickMin(min);setWhen(korea(min));resetMatches();}}>{min}{t.fastMin}</button>)}</div></div>
         <input aria-label={t.time} type="time" value={when.time}
           onChange={e=>{setQuickMin(null);setWhen({date:kstAlightDateForTime(e.target.value),time:e.target.value});resetMatches();}}/>
       </div>
     </div>
     <div className="tf-auto-state" role="status">
       {busy?t.looking:next?(searched?(lang==='ko'?'조건을 바꾸면 자동으로 다시 검색해요.':lang==='en'?'Results update automatically.':lang==='ja'?'条件変更で自動更新':'条件变更后自动更新'):(lang==='ko'?'실시간 열차 확인 중…':t.looking)):(lang==='ko'?'열차가 떠난 방향을 누르면 바로 검색해요.':lang==='en'?'Choose a direction to find trains.':lang==='ja'?'進行方向を選択すると検索します。':'选择方向后自动搜索。')}
     </div>
   </form>
   {error&&<div className="tf-warning" role="alert">{error}</div>}
   {searched&&next&&requiredDirection!==null&&!error&&<TrainLiveDiagram
      line={selection.line} station={selection.name} next={next} lang={lang}
      positions={livePositions} fetchedAt={liveFetchedAt} candidates={candidates}
      selected={chosen} active={active&&!busy} demo={demoMode} onSnapshot={onLiveSnapshot}
      onPick={pick}
    />}
   {searched&&!busy&&!error&&candidates.length===0&&<p className="tf-warning">{t.none}{lookupStats&&lang==='ko'?(' · API '+(lookupStats.usableRows??'-')+'건'):''}</p>}
   {searched&&!busy&&!error&&candidates.length>0&&<div className="tf-estimate-row">
     <span>{lang==='ko'?('하차 후 약 '+Math.max(0,Math.round((Date.now()-Date.parse(when.date+'T'+when.time+':00+09:00'))/120000))+'정거장 예상 · 정거장당 2분 기준'):'≈2 min per station · estimates only'}</span>
     <div className="tf-candidate-chips">{candidates.slice(0,8).map(c=><button type="button" key={c.number}
       className={compareNo(chosen?.number)===compareNo(c.number)?'chosen':''} onClick={()=>pick(c)}
       aria-pressed={compareNo(chosen?.number)===compareNo(c.number)}>
       <strong>#{c.number}</strong>
       <span>{fmt(c.station,lang)} · {lang==='ko'?('오차 '+(c.stopsFromAlight-Math.round(c.estimatedStops)>0?'+':'')+(c.stopsFromAlight-Math.round(c.estimatedStops))+'역'):('Δ'+(c.stopsFromAlight-Math.round(c.estimatedStops))+' stops')}</span>
     </button>)}</div>
   </div>}
   {chosen&&<section className="tf-results tf-compact-results">
     <div className="tf-summary-head"><h3>{t.selected} · #{chosen.number}</h3>
       <button type="button" onClick={()=>{setChosen(null);setCurrent(null);}}>{lang==='ko'?'선택 해제':t.again}</button>
     </div>
     <div className="tf-location tf-compact-location">
       <div><small>{t.position}</small><strong>{current?fmt(current.station,lang):t.absent}</strong></div>
       <span>{lang==='ko'?('예상 '+Math.round(chosen.estimatedStops)+'역 · 실제 '+chosen.stopsFromAlight+'역 · 차이 '+(chosen.stopsFromAlight-Math.round(chosen.estimatedStops)>0?'+':'')+(chosen.stopsFromAlight-Math.round(chosen.estimatedStops))+'역'):('Expected '+Math.round(chosen.estimatedStops)+' · observed '+chosen.stopsFromAlight+' stops')}</span>
     </div>
     {liveInfo&&<p className="tf-warning">{liveInfo}</p>}
     {recommended.stations.length>0&&<div className="tf-contact-row">
       <small>{t.forth}</small>
       <div className="tf-stops">{recommended.stations.map(st=><span className="tf-stop" key={st}><strong>{fmt(st,lang)}</strong></span>)}</div>
     </div>}
     {!demoMode&&<>
       <div className="tf-two tf-lost-inputs">
         <div className="tf-field"><label>{t.thing}</label><input value={thing} maxLength={80} placeholder={t.thingExample} onChange={e=>setThing(e.target.value)}/></div>
         <div className="tf-field"><label>{t.car}</label><input value={car} maxLength={30} placeholder={t.carExample} onChange={e=>setCar(e.target.value)}/></div>
       </div>
       <div className="tf-actions"><button type="button" className="tf-submit" onClick={sms}>{t.openSms}</button>
         <button type="button" onClick={copyMessage}>{copyStatus?'✓ '+t.copy:t.copy}</button>
         <a href="tel:15771234">{t.call}</a>
       </div>
       <details className="tf-message-details"><summary>{lang==='ko'?'발송할 문자 내용 확인':t.sms}</summary>
         <textarea className="tf-message" readOnly aria-label={t.sms} value={message} rows={9}/>
       </details>
     </>}
     <p className="tf-hint">{t.guide}</p>
   </section>}
   <p className="tf-footer">SOURCE · 서울시 실시간 열차 위치·도착정보 (역 단위)</p>
 </div>;
}
