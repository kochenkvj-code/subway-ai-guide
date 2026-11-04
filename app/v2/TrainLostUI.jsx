'use client';
import {stationName,lineName} from '../lib/stationNameI18n';
import {trainStationDisplay} from '../lib/train-lost';
import TrainLiveDiagram from './TrainLiveDiagram';
import './train-lost-redesign.css';

const dictionary={
 ko:{heroIn:'내가 내린 열차, 지금 어디 있을까요?',heroOut:'찾은 열차 후보를 확인하세요',subtitle:'하차 정보와 탑승 위치로 열차 후보를 찾고, 담당자에게 전달할 내용을 준비합니다.',resultSubtitle:'실시간 위치를 바탕으로 추정한 후보입니다. 승객이 탑승했던 열차로 확정된 것은 아닙니다.',stepInput:'하차·분실 정보',stepResult:'열차 확인·정보 전달',panelA:'언제, 어디서 내렸나요?',panelB:'무엇을, 어디에 두셨나요?',direction:'열차가 어느 쪽으로 떠났나요?',directionSub:'다음 역',elapsed:'내린 지 얼마나 지났나요?',mins:'분 전',custom:'직접 입력',minutes:'분',range:'최대 30분',exact:'정확한 하차 시각으로 입력',item:'분실 물품',itemExample:'예: 검은색 가방, 흰색 이어폰',carQuestion:'몇 번째 칸에 탑승하셨나요?',carWhy:'담당자가 짧은 정차시간에 찾을 수 있도록 최소한 칸 위치는 알려주세요.',numberMode:'호차 번호를 알아요',relativeMode:'몇 번째 칸인지 알아요',front:'열차 맨 앞에서',back:'열차 맨 뒤에서',carUnit:'호차',relativeUnit:'번째 칸',carHelp:'번호를 모르면 ‘몇 번째 칸인지 알아요’를 선택하세요.',relativeHelp:'앞·뒤 기준과 순서를 그대로 전달하며, 호차 번호로 임의 변환하지 않습니다.',door:'출입문 위치',unknown:'모름',doorUnit:'번',place:'물건을 둔 곳',seat:'좌석',rack:'선반',nearDoor:'출입문 근처',floor:'바닥',required:'필수',optional:'선택',search:'실시간 열차 후보 찾기',inputHint:'분실 물품·탑승 칸·진행 방향을 모두 입력해 주세요.',searching:'실시간 열차 정보를 확인하고 있어요',searchingInfo:'실제 API 응답을 기다리는 중입니다.',found:'확인할 후보 열차',trains:'대',rank:'먼저 확인할 후보',nextRank:'다음 후보',candidate:'후보·미확정',train:'열차',position:'최근 확인 위치',corroborated:'후속역 도착정보로 열차번호 교차확인',unverified:'위치 기반 추정 · 이동 이력 미확정',stopCount:'하차역에서',stops:'역',choose:'이 열차로 전달 준비',chosen:'선택한 후보',other:'다른 후보 더 보기',noneMatch:'이 열차들이 아닌 것 같아요',fullMap:'전체 실시간 열차 배치도 보기',mapHint:'실시간 위치는 역 단위이며 열차가 과거에 어디를 지났는지 보장하지 않습니다.',handoff:'전달할 정보가 준비됐어요',handoffSub:'담당 역 또는 콜센터에 전달할 내용을 확인하세요.',trainChosen:'후보 열차',boarding:'탑승 위치',lostItem:'분실 물품',alighted:'하차 정보',message:'전달 메시지',copy:'문구 복사',copied:'복사 완료',sms:'문자 앱에서 작성',call:'1577-1234 전화',smsCaution:'문자는 자동 발송되지 않습니다. 1577-1234의 문자 수신 여부는 확인되지 않았으니 수신처를 확인하세요.',operating:'실제 열차 수배와 관제 협조는 정보를 전달받은 역 또는 콜센터가 판단하고 진행합니다.',noResults:'실시간 열차 후보를 확인하지 못했어요. 하차 정보가 맞는지 확인하거나 후보 미확정 상태로 정보를 전달하세요.',noCandidate:'열차 미확정 상태로 전달하기',edit:'하차·분실 정보 수정',stationUnavailable:'이 역의 열차 경로가 연결되지 않았습니다.',branches:'분기 구간은 후보가 실제로 지나갈 역을 추가 확인해야 합니다.',demo:'가상 열차 시연 · 실제 수배에 사용하지 마세요',station:'하차역',change:'변경',manual:'직접 입력',routePart:'하차역부터 현재 위치까지 추정 경로 일부',stopsAhead:'추정 후속역 (정차·연락 가능 여부 미확인)',info:'역 기준 실시간 위치·도착정보를 사용합니다.',refresh:'열차 위치는 20초마다 갱신됩니다.',needDirection:'열차가 떠난 방향을 선택해 주세요.'},
 en:{heroIn:'Where is the train you left?',heroOut:'Review possible trains',subtitle:'Find candidate trains and prepare details for station staff or the call center.',resultSubtitle:'These are estimates from live position reports—not confirmed boarding records.',stepInput:'Trip and lost item',stepResult:'Trains and handoff',panelA:'Where and when did you get off?',panelB:'What and where was the item?',direction:'Which way did the train leave?',directionSub:'Next stop',elapsed:'How long ago did you get off?',mins:'min ago',custom:'Custom',minutes:'min',range:'Within 30 min',exact:'Enter exact alighting time',item:'Lost item',itemExample:'e.g. black backpack',carQuestion:'Which car did you board?',carWhy:'Staff need the car location to search during a short stop.',numberMode:'I know the car number',relativeMode:'I know its position',front:'From the front',back:'From the rear',carUnit:'car',relativeUnit:'car from end',carHelp:'If unsure of the number, choose its position.',relativeHelp:'Front/rear position is reported as stated, not converted into a car number.',door:'Door location',unknown:'Unknown',doorUnit:'Door',place:'Where was it left?',seat:'Seat',rack:'Overhead rack',nearDoor:'Near door',floor:'Floor',required:'Required',optional:'Optional',search:'Find live train candidates',inputHint:'Enter item, car location and direction first.',searching:'Checking live train information',searchingInfo:'Waiting for actual API responses.',found:'Candidate trains',trains:'',rank:'First candidate to check',nextRank:'Other candidate',candidate:'Not confirmed',train:'train',position:'Last reported at',corroborated:'Train number also seen in arrival reports',unverified:'Estimated from position; past route unverified',stopCount:'From alighting station',stops:'stops',choose:'Prepare handoff for this train',chosen:'Candidate selected',other:'Show other candidates',noneMatch:'None of these trains',fullMap:'Show full live train map',mapHint:'Station-level reports do not confirm past train movements.',handoff:'Handoff details ready',handoffSub:'Review details before sharing with station staff or the call center.',trainChosen:'Candidate train',boarding:'Car position',lostItem:'Lost item',alighted:'Alighting details',message:'Handoff message',copy:'Copy details',copied:'Copied',sms:'Open SMS draft',call:'Call 1577-1234',smsCaution:'Not sent automatically. SMS reception at 1577-1234 has not been verified; confirm the recipient.',operating:'The receiving staff or call center decide any train search or operational coordination.',noResults:'No matching live trains were found. Review your details or hand off without a train number.',noCandidate:'Handoff without train number',edit:'Edit trip and lost-item details',stationUnavailable:'No route graph is available for this station.',branches:'Branches can make future stops uncertain.',demo:'DEMO trains — do not report as real',station:'Alighting station',change:'Change',manual:'Custom',routePart:'Partial estimated route to reported position',stopsAhead:'Possible downstream stations (unverified)',info:'Uses station-level live train and arrival data.',refresh:'Live positions refresh about every 20 seconds.',needDirection:'Select the train direction.'},
 ja:{heroIn:'降りた列車は今どこに？',heroOut:'列車候補を確認してください',subtitle:'下車情報と乗車位置から候補を探し、駅係員への連絡内容を準備します。',resultSubtitle:'現在位置に基づく推定です。乗車した列車とは確定できません。',stepInput:'下車・忘れ物',stepResult:'列車確認・情報共有',panelA:'いつ、どこで降りましたか？',panelB:'何を、どこに忘れましたか？',direction:'列車はどちらに出発しましたか？',directionSub:'次の駅',elapsed:'降りてから何分ですか？',mins:'分前',custom:'直接入力',minutes:'分',range:'30分以内',exact:'下車時刻を直接入力',item:'忘れ物',itemExample:'例：黒いリュック',carQuestion:'何両目に乗りましたか？',carWhy:'短い停車時間に探せるよう乗車位置が必要です。',numberMode:'車両番号を知っている',relativeMode:'前後から何両目か知っている',front:'列車の先頭から',back:'列車の最後尾から',carUnit:'号車',relativeUnit:'両目',carHelp:'番号が分からなければ前後からの位置を選択してください。',relativeHelp:'前後からの位置をそのまま伝え、車両番号に換算しません。',door:'ドア位置',unknown:'不明',doorUnit:'番',place:'置いた場所',seat:'座席',rack:'棚',nearDoor:'ドア付近',floor:'床',required:'必須',optional:'任意',search:'列車候補を検索',inputHint:'忘れ物・車両位置・方向を入力してください。',searching:'リアルタイム情報を確認中',searchingInfo:'APIからの応答を待っています。',found:'候補列車',trains:'本',rank:'最初に確認する候補',nextRank:'次の候補',candidate:'未確定',train:'列車',position:'最新確認駅',corroborated:'到着情報とも一致',unverified:'現在位置から推定・過去経路は未確認',stopCount:'下車駅から',stops:'駅',choose:'この列車の情報を準備',chosen:'選択済み',other:'ほかの候補を見る',noneMatch:'どの候補でもない',fullMap:'全列車の位置を表示',mapHint:'駅単位の位置情報で過去の通過駅は保証されません。',handoff:'連絡内容を準備しました',handoffSub:'駅係員やコールセンターに共有する前に確認してください。',trainChosen:'候補列車',boarding:'乗車位置',lostItem:'忘れ物',alighted:'下車情報',message:'連絡文',copy:'コピー',copied:'コピーしました',sms:'SMSを作成',call:'1577-1234に電話',smsCaution:'SMSは自動送信されません。1577-1234のSMS受信可否は未確認です。',operating:'実際の列車捜索・運行調整は担当駅やコールセンターが判断します。',noResults:'候補がありません。情報を見直すか列車未確定で連絡してください。',noCandidate:'列車未確定で連絡',edit:'下車・忘れ物情報を修正',stationUnavailable:'この駅の経路情報は未対応です。',branches:'分岐区間は経路の確認が必要です。',demo:'架空列車のデモです',station:'下車駅',change:'変更',manual:'入力',routePart:'推定経路の一部',stopsAhead:'後続駅候補（未確認）',info:'駅単位の現在位置データを使用',refresh:'約20秒ごとに更新',needDirection:'方向を選択してください。'},
 zh:{heroIn:'下车的列车现在在哪里？',heroOut:'请查看可能的列车',subtitle:'通过下车信息和车厢位置查找候选列车，准备交给车站人员的信息。',resultSubtitle:'根据实时位置推测，无法确认是否为您乘坐的列车。',stepInput:'下车与遗失信息',stepResult:'列车确认与转交',panelA:'何时何地下车？',panelB:'物品遗落在哪里？',direction:'列车驶往哪个方向？',directionSub:'下一站',elapsed:'下车多久了？',mins:'分钟前',custom:'手动输入',minutes:'分钟',range:'30分钟内',exact:'输入下车时刻',item:'遗失物品',itemExample:'例如：黑色背包',carQuestion:'您乘坐第几节车厢？',carWhy:'工作人员需要车厢位置，以便在短暂的停车时间内查找。',numberMode:'知道车厢编号',relativeMode:'知道前后位置',front:'从车头算起',back:'从车尾算起',carUnit:'车厢',relativeUnit:'节车厢',carHelp:'不知道编号可选择前后位置。',relativeHelp:'只记录前后位置，不自动换算车厢编号。',door:'车门位置',unknown:'不清楚',doorUnit:'号',place:'放置位置',seat:'座位',rack:'行李架',nearDoor:'车门附近',floor:'地板',required:'必填',optional:'选填',search:'查找实时列车候选',inputHint:'请填写物品、车厢位置和方向。',searching:'正在查询实时列车信息',searchingInfo:'正在等待实际 API 响应。',found:'候选列车',trains:'列',rank:'优先查看',nextRank:'其他候选',candidate:'尚未确认',train:'列车',position:'最近报告位置',corroborated:'与后续到站信息交叉核对',unverified:'位置推测·历史路线未确认',stopCount:'距下车站',stops:'站',choose:'准备转交此列车信息',chosen:'已选择',other:'查看更多候选',noneMatch:'都不是这些列车',fullMap:'查看全部实时列车图',mapHint:'站级位置数据不能证实历史经过路线。',handoff:'转交信息已准备好',handoffSub:'在联系车站或客服前核对内容。',trainChosen:'候选列车',boarding:'乘车位置',lostItem:'遗失物品',alighted:'下车信息',message:'转交信息',copy:'复制',copied:'已复制',sms:'打开短信草稿',call:'拨打 1577-1234',smsCaution:'短信不会自动发送。尚未核实 1577-1234 是否接收短信。',operating:'列车搜寻和运行协调由接收信息的车站或客服决定。',noResults:'未找到实时候选。请核对信息，或不填写车次直接转交。',noCandidate:'不确定车次也可转交',edit:'修改下车与遗失信息',stationUnavailable:'此站暂不支持路线图。',branches:'支线区段需进一步核实路线。',demo:'虚拟列车演示，勿用于实际报失',station:'下车站',change:'更改',manual:'手动',routePart:'部分推测行车路线',stopsAhead:'后续车站候选（未确认）',info:'使用站级实时列车位置数据',refresh:'约每20秒更新',needDirection:'请选择行车方向。'}
};
const compareNo=x=>String(x||'').replace(/^0+(?=\d)/,'');
const localized=(name,line,lang)=>stationName(trainStationDisplay(line,name),lang)||name;

const flowCopy={
 ko:{steps:['정보 입력','열차 확인','수배 요청'],time:'하차 시각',timeGuide:'선택한 시간은 열차 검색 시점에 다시 계산됩니다.',timeExact:'하차 시각 직접 수정',additional:'출입문·물품 위치 추가 (선택)',candidateCount:'실시간 후보',candidateHelp:'후보를 누르면 아래 배치도에서 해당 열차를 강조합니다.',mapTitle:'실시간 열차 위치 확인',confirm:'선택한 열차 정보로 계속하기',selectHint:'열차 배치도 또는 위 후보에서 열차를 선택하세요.',chosenPosition:'선택한 열차 최근 위치',fallback:'열차번호 미확정으로 전달하기',handoffBack:'← 열차 위치 다시 확인',quickEdit:'← 입력 정보 수정',secondary:'후보는 실제 탑승 열차로 확정되지 않았습니다.',noCandidate:'실시간 후보가 없더라도 하차·분실 정보를 전달할 수 있습니다.',timeRef:'검색에 적용할 하차 시각'},
 en:{steps:['Enter details','Find the train','Handoff'],time:'Alighting time',timeGuide:'Relative time is recalculated when you start the search.',timeExact:'Edit exact alighting time',additional:'Door & item position (optional)',candidateCount:'Live candidates',candidateHelp:'Tap a candidate to focus it in the live train diagram.',mapTitle:'Live train positions',confirm:'Continue with this train',selectHint:'Choose a train above or in the live diagram.',chosenPosition:'Selected train last seen',fallback:'Handoff without a confirmed train',handoffBack:'← Back to live train view',quickEdit:'← Edit information',secondary:'A candidate is not a verified boarding record.',noCandidate:'You can still hand off details without a train number.',timeRef:'Alighting time used in search'},
 ja:{steps:['情報入力','列車確認','連絡内容'],time:'下車時刻',timeGuide:'「何分前」は検索時点で再計算されます。',timeExact:'正確な下車時刻を入力',additional:'ドア・置いた場所（任意）',candidateCount:'列車候補',candidateHelp:'候補を押すと下の列車位置図で強調します。',mapTitle:'リアルタイム列車位置',confirm:'この列車の情報で続ける',selectHint:'候補または列車位置図から選択してください。',chosenPosition:'選択列車の最新確認位置',fallback:'列車番号未確定で連絡',handoffBack:'← 列車位置に戻る',quickEdit:'← 情報を修正',secondary:'候補は乗車列車として確定していません。',noCandidate:'列車番号なしでも忘れ物情報を連絡できます。',timeRef:'検索に使用する下車時刻'},
 zh:{steps:['填写信息','确认列车','转交信息'],time:'下车时间',timeGuide:'搜索时会重新计算“几分钟前”。',timeExact:'修改准确下车时间',additional:'车门及遗失位置（选填）',candidateCount:'实时候选',candidateHelp:'点击候选列车，在下方实时图中突出显示。',mapTitle:'实时列车位置',confirm:'用所选列车继续',selectHint:'请在候选列表或实时图中选择列车。',chosenPosition:'所选列车最近位置',fallback:'无法确认车次时转交',handoffBack:'← 返回实时列车图',quickEdit:'← 修改信息',secondary:'候选列车不代表实际乘车记录。',noCandidate:'没有车次也可以转交遗失信息。',timeRef:'搜索使用的下车时间'}
};
export default function TrainLostUI(p){
 const {lang='ko',t,active,demoMode,selection,selectionLabel,lines,neighbors,requiredDirection,matches,
 editing,setEditing,query,setQuery,chooseStation,next,setNext,when,setWhen,quickMin,setQuickMin,korea,kstAlightDateForTime,resetMatches,
 busy,error,candidates,chosen,current,searched,lookupStats,directionWarning,pick,livePositions,liveFetchedAt,onLiveSnapshot,
 onSearch,onBack,onNone,onContinue,onBackToResults,carMode,setCarMode,carNumber,setCarNumber,relativeSide,setRelativeSide,thing,setThing,door,setDoor,place,setPlace,
 stage,handoffUnknown,message,sms,copyMessage,copyStatus,recommended,liveInfo}=p;
 const u=dictionary[lang]||dictionary.ko;
 const v=flowCopy[lang]||flowCopy.ko;
 const carLabel=carNumber?(carMode==='number'?carNumber+u.carUnit:(relativeSide==='앞'?u.front:u.back)+' '+carNumber+u.relativeUnit):'';
 const canSearch=Boolean(thing.trim()&&carNumber&&next&&requiredDirection!==null&&neighbors.length);
 const way=next?localized(next,selection.line,lang):'';
 const displayTime=when.date.replace(/-/g,'.')+' '+when.time;
 const stageNumber=stage==='input'?1:stage==='results'?2:3;
 const closeStation=()=>setEditing(!editing);
 return <div className="tf-root tf-redesign tl-three-stage">
  <section className="tl-hero"><span>LOST ITEM · TRAIN FINDER</span><h2>{stage==='input'?u.heroIn:stage==='results'?u.heroOut:u.handoff}</h2><p>{stage==='input'?u.subtitle:stage==='results'?u.resultSubtitle:u.handoffSub}</p></section>
  <nav className="tl-stepbar" aria-label={v.steps.join(' → ')}>
   {v.steps.map((label,i)=><span key={label} className={'tl-step'+(i+1===stageNumber?' current':i+1<stageNumber?' done':'')} aria-current={i+1===stageNumber?'step':undefined}><b>{i+1<stageNumber?'✓':i+1}</b>{label}</span>)}
  </nav>
  {demoMode&&<p className="tf-warning">DEMO · {u.demo}</p>}
  {stage==='input'&&<>
   <section className="tl-panel tl-input-panel">
    <h3 className="tl-panel-title"><em>01</em>{u.panelA}</h3>
    <div className="tl-field"><div className="tl-label">{u.station}</div>
     <div className="tl-station"><span className="tl-station-bubble">{selection.line}</span><div className="tl-station-name">{selectionLabel}<small>{lineName(selection.line+'호선',lang)}</small></div><button type="button" className="tl-link" onClick={closeStation}>{editing?u.change+' ×':u.change}</button></div>
     {editing&&<div className="tl-picker"><input type="search" value={query} placeholder={t.search} onChange={e=>setQuery(e.target.value)} aria-label={t.search} autoComplete="off"/>{matches.length>0&&<div className="tf-matches">{matches.map(s=><button type="button" key={s.name+'/'+s.line} onClick={()=>chooseStation(s)}>{s.display} · {lineName(s.line+'호선',lang)}</button>)}</div>}</div>}
    </div>
    {lines.length>1&&<div className="tl-field"><div className="tl-label">{t.line}</div><select className="tl-input" value={selection.line} onChange={e=>chooseStation({name:selection.name,line:e.target.value})}>{lines.map(l=><option key={l} value={l}>{lineName(l+'호선',lang)}</option>)}</select></div>}
    {!neighbors.length&&<p className="tf-warning">{u.stationUnavailable}</p>}
    <div className="tl-field tl-direction-field"><div className="tl-label">{u.direction}<span className="tl-required">{u.required}</span></div><div className={'tl-directions'+(neighbors.length===1?' tl-directions-single':'')} role="group" aria-label={u.direction}>{neighbors.map((st,i)=><button type="button" className="tl-choice" key={st} aria-pressed={next===st} aria-label={localized(st,selection.line,lang)+' · '+u.directionSub} onClick={()=>{if(next!==st){setNext(st);resetMatches();}}}><span className="tl-direction-arrow" aria-hidden="true">{i===0?'←':i===1?'→':'↗'}</span><strong>{localized(st,selection.line,lang)}</strong><small>{u.directionSub}</small>{next===st&&<span className="tl-direction-check" aria-hidden="true">✓</span>}</button>)}</div>{next&&requiredDirection===null&&<p className="tf-warning">{u.needDirection}</p>}{neighbors.length>2&&<p className="tl-note">{u.branches}</p>}</div>
    <div className="tl-field tl-time-field"><div className="tl-label">{u.elapsed}<span className="tl-required">{u.required}</span></div>
     <div className="tl-times">{[3,5,10,15].map(n=><button type="button" className="tl-chip" key={n} aria-pressed={quickMin===n} onClick={()=>{setQuickMin(n);setWhen(korea(n));resetMatches();}}>{n}{u.mins}</button>)}</div>
     <div className="tl-time-summary" role="status"><span>◷ {v.time}</span><strong>{displayTime}</strong></div>
     <details className="tl-exact-time"><summary>{v.timeExact}</summary><div className="tl-time-extra"><label>{u.custom} ({u.minutes}) <input type="number" min="1" max="30" inputMode="numeric" aria-label={u.custom} placeholder="1–30" value={quickMin===null?'':quickMin} onChange={e=>{const n=Number(e.target.value);if(e.target.value===''||!Number.isInteger(n)||n<1||n>30){setQuickMin(null);return;}setQuickMin(n);setWhen(korea(n));resetMatches();}}/></label><label>{v.time} <input type="time" aria-label={t.time} value={when.time} onChange={e=>{setQuickMin(null);setWhen({date:kstAlightDateForTime(e.target.value),time:e.target.value});resetMatches();}}/></label></div></details>
     <p className="tl-note">{quickMin===null?u.range:v.timeGuide}</p>
    </div>
   </section>
   <section className="tl-panel tl-input-panel">
    <h3 className="tl-panel-title"><em>02</em>{u.panelB}</h3>
    <div className="tl-field"><label className="tl-label" htmlFor="tl-item">{u.item}<span className="tl-required">{u.required}</span></label><input className="tl-input" id="tl-item" type="text" value={thing} maxLength={80} placeholder={u.itemExample} onChange={e=>setThing(e.target.value)}/></div>
    <div className="tl-field"><div className="tl-label">{u.carQuestion}<span className="tl-required">{u.required}</span></div>
     <div className="tl-switch"><button type="button" aria-pressed={carMode==='number'} onClick={()=>{setCarMode('number');setCarNumber('');}}>{u.numberMode}</button><button type="button" aria-pressed={carMode==='relative'} onClick={()=>{setCarMode('relative');setCarNumber('');}}>{u.relativeMode}</button></div>
     {carMode==='relative'&&<div className="tl-edges"><button type="button" aria-pressed={relativeSide==='앞'} onClick={()=>setRelativeSide('앞')}>{u.front}</button><button type="button" aria-pressed={relativeSide==='뒤'} onClick={()=>setRelativeSide('뒤')}>{u.back}</button></div>}
     <div className="tl-cars">{Array.from({length:10},(_,i)=>String(i+1)).map(n=><button type="button" className="tl-car" key={n} aria-pressed={carNumber===n} onClick={()=>setCarNumber(n)}>{n}<small>{carMode==='number'?u.carUnit:u.relativeUnit}</small></button>)}</div>
     {carNumber&&<p className="tl-chosen-car">✓ {carLabel}</p>}
     {carMode==='relative'&&<p className="tl-note">{u.relativeHelp}</p>}
    </div>
    <details className="tl-extra-details"><summary>{v.additional}{door||place?' ✓':''}</summary><div className="tl-extra-content">
     <div className="tl-field"><div className="tl-label">{u.door}<span className="tl-optional">{u.optional}</span></div><div className="tl-mini-list">{['','1','2','3','4'].map(n=><button type="button" key={n} aria-pressed={door===n} onClick={()=>setDoor(n)}>{n?n+u.doorUnit:u.unknown}</button>)}</div></div>
     <div className="tl-field"><div className="tl-label">{u.place}<span className="tl-optional">{u.optional}</span></div><div className="tl-mini-list">{['seat','rack','nearDoor','floor'].map(id=><button type="button" key={id} aria-pressed={place===id} onClick={()=>setPlace(place===id?'':id)}>{u[id]}</button>)}</div></div>
    </div></details>
   </section>
   <div className="tl-search-footer"><button type="button" className="tl-primary" disabled={!canSearch} onClick={onSearch}>{u.search} →</button><p className="tl-footer-hint">{canSearch?v.timeRef+': '+displayTime:u.inputHint}</p></div>
  </>}
  {stage==='results'&&<>
   <section className="tl-search-context"><span>{lineName(selection.line+'호선',lang)} · {selectionLabel} → {way}</span><strong>◷ {v.time} {displayTime}</strong><button type="button" className="tl-link" onClick={onBack}>{u.change}</button></section>
   {busy&&<div className="tl-searching" role="status"><div className="tl-spinner"/><div><strong>{u.searching}</strong><p>{u.searchingInfo}</p></div></div>}
   {error&&<div className="tf-warning" role="alert">{error}</div>}
   {!busy&&searched&&!error&&<div className="tl-live-candidate-header"><strong>{v.candidateCount} {candidates.length}{u.trains}</strong><span>{v.secondary}</span></div>}
   {!busy&&searched&&!error&&candidates.length>0&&<div className="tl-candidate-strip" role="group" aria-label={v.candidateCount}>
    {candidates.map((c,index)=>{const selected=compareNo(chosen?.number)===compareNo(c.number);
     return <button type="button" key={c.number+'/'+index} aria-pressed={selected} onClick={()=>pick(c)} className={'tl-candidate-chip'+(selected?' selected':'')}>
      <small>{index===0?'①':index===1?'②':'#'+(index+1)} {u.candidate}</small><strong>#{c.number}</strong><span>{localized(current&&selected?current.station:c.station,selection.line,lang)}</span>
     </button>;
    })}
   </div>}
   {!busy&&searched&&!error&&candidates.length>0&&<p className="tl-candidate-hint">{v.candidateHelp}</p>}
   {!busy&&searched&&!error&&candidates.length===0&&<div className="tl-empty">{u.noResults}{lookupStats&&lang==='ko'?' · API '+(lookupStats.usableRows??'-')+'건':''} <p>{v.noCandidate}</p></div>}
   {searched&&!error&&!busy&&<div className="tl-live-map-main">
    <div className="tl-live-map-title"><strong>◎ {v.mapTitle}</strong><span>{u.refresh}</span></div>
    <TrainLiveDiagram line={selection.line} station={selection.name} next={next} lang={lang} positions={livePositions} fetchedAt={liveFetchedAt} candidates={candidates} selected={chosen} active={active} demo={demoMode} onSnapshot={onLiveSnapshot} onPick={pick}/>
   </div>}
   {directionWarning&&<p className="tl-note">{t.directionUnknown}</p>}
   {!busy&&<section className="tl-next-panel">
    {chosen?<><div className="tl-selection-summary"><div><small>✓ {u.chosen}</small><strong>#{chosen.number}</strong></div><div><small>{v.chosenPosition}</small><strong>{current?localized(current.station,selection.line,lang):u.unknown}</strong></div></div><p className="tl-note">{v.secondary}</p><button type="button" className="tl-primary" onClick={onContinue}>{v.confirm} →</button></>:
    <><p className="tl-select-instruction">{candidates.length>0?v.selectHint:v.noCandidate}</p><button type="button" className="tl-primary tl-secondary-primary" onClick={onNone}>{v.fallback} →</button></>}
    <button type="button" className="tl-secondary" onClick={onBack}>{v.quickEdit}</button>
    {chosen&&<button type="button" className="tl-text-option" onClick={onNone}>{v.fallback}</button>}
   </section>}
  </>}
  {stage==='handoff'&&<>
   <section className="tl-search-context"><span>{lineName(selection.line+'호선',lang)} · {selectionLabel} → {way}</span><strong>◷ {v.time} {displayTime}</strong></section>
   <section className="tl-panel tl-handoff">
    <div className="tl-handoff-head"><span className="tl-handoff-icon">↗</span><div><h3>{u.handoff}</h3><p>{u.handoffSub}</p></div></div>
    <div className="tl-handoff-grid">
     <div className="tl-handoff-cell"><small>{u.trainChosen}</small><strong>{chosen?'#'+chosen.number+' · '+u.candidate:u.unknown}</strong></div>
     <div className="tl-handoff-cell"><small>{u.boarding}</small><strong>{carLabel}{door?' · '+door+u.doorUnit:''}</strong></div>
     <div className="tl-handoff-cell"><small>{u.lostItem}</small><strong>{thing}</strong></div>
     <div className="tl-handoff-cell"><small>{u.alighted}</small><strong>{selectionLabel} · {displayTime}</strong></div>
    </div>
    {chosen&&current&&<p className="tl-note">{u.position}: {localized(current.station,selection.line,lang)}</p>}
    {chosen&&recommended.stations.length>0&&<p className="tl-note">{u.stopsAhead}: {recommended.stations.map(st=>localized(st,selection.line,lang)).join(' · ')}</p>}
    {liveInfo&&<p className="tf-warning">{liveInfo}</p>}
    <div className="tl-label">{u.message}</div><div className="tl-message">{message}</div>
    <div className="tl-send-options"><button type="button" className="tl-copy" onClick={copyMessage}>{copyStatus?'✓ '+u.copied:u.copy}</button><button type="button" className="tl-sms" onClick={sms}>{u.sms}</button></div><a className="tl-call" href="tel:15771234">☎ {u.call}</a>
    <p className="tl-caution">{u.smsCaution}<br/>{u.operating}</p>
   </section>
   <div className="tl-reset-row"><button type="button" className="tl-secondary" onClick={onBackToResults}>{v.handoffBack}</button><button type="button" className="tl-secondary" onClick={onBack}>{v.quickEdit}</button></div>
  </>}
  <p className="tl-status-foot">SOURCE · {u.info}</p>
 </div>;
}
