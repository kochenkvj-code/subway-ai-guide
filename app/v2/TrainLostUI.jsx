'use client';
import {stationName,lineName} from '../lib/stationNameI18n';
import {trainStationDisplay} from '../lib/train-lost';
import TrainLiveDiagram from './TrainLiveDiagram';
import './train-lost-redesign.css';

const LINE_COLORS={
 '1':'#24559b','2':'#219052','3':'#ef8928','4':'#238cc4',
 '5':'#9256ab','6':'#a77935','7':'#687a32','8':'#d13e78','9':'#ae8c35'
};
const pickerLineColor=line=>LINE_COLORS[String(line||'').replace(/^0/,'')]||'#536c80';

const dictionary={
 ko:{heroIn:'분실 정보를 알려주세요',heroOut:'열차 정보를 확인하고 있어요',heroFound:'열차 후보를 찾았어요',heroEmpty:'열차 후보를 찾지 못했어요',subtitle:'하차역·시각과 분실 물품을 입력해 주세요.',resultSubtitle:'실시간 열차 정보를 조회하고 있어요.',resultSubtitleTop:'선택된 열차가 맞는지 확인해 주세요.',resultSubtitleChosen:'선택된 열차가 맞는지 확인해 주세요.',resultSubtitleEmpty:'하차 정보를 수정하거나 열차번호 없이 접수할 수 있어요.',stepInput:'하차·분실 정보',stepResult:'열차 확인·정보 전달',panelA:'언제, 어디서 내렸나요?',panelB:'무엇을, 어디에 두셨나요?',direction:'열차가 어느 쪽으로 떠났나요?',directionSub:'다음 역',elapsed:'내린 지 얼마나 지났나요?',mins:'분 전',custom:'직접 입력',minutes:'분',range:'최대 30분',exact:'정확한 하차 시각으로 입력',item:'분실 물품',itemExample:'예: 검은색 가방, 흰색 이어폰',carQuestion:'탑승 호차',carUnit:'호차',door:'출입문 번호',unknown:'모름',doorUnit:'번',place:'물건을 둔 곳',seat:'좌석',rack:'선반',nearDoor:'출입문 근처',floor:'바닥',required:'필수',optional:'선택',search:'실시간 열차 후보 찾기',inputHint:'분실 물품·탑승 칸·출입문·진행 방향을 모두 입력해 주세요.',searching:'실시간 열차 정보를 확인하고 있어요',searchingInfo:'실제 API 응답을 기다리는 중입니다.',found:'확인할 후보 열차',trains:'대',rank:'먼저 확인할 후보',nextRank:'다음 후보',candidate:'추정 열차',train:'열차',position:'최근 확인 위치',corroborated:'후속역 도착정보로 열차번호 교차확인',unverified:'위치 기반 추정 · 이동 이력 미확정',stopCount:'하차역에서',stops:'역',choose:'이 열차로 전달 준비',chosen:'선택한 후보',other:'다른 후보 더 보기',noneMatch:'이 열차들이 아닌 것 같아요',fullMap:'전체 실시간 열차 배치도 보기',mapHint:'실시간 위치는 역 단위이며 열차가 과거에 어디를 지났는지 보장하지 않습니다.',handoff:'전달할 정보가 준비됐어요',handoffSub:'내용을 확인한 뒤 문자로 접수해 주세요.',handoffReview:'접수 내용 확인',trainChosen:'선택한 열차',boarding:'탑승 위치',lostItem:'분실 물품',alighted:'하차 정보',message:'전달 메시지',copy:'문구 복사',copied:'복사 완료',smsTarget:'1577-1234',sms:'콜센터에 문자 접수하기',call:'1577-1234 전화',smsCaution:'버튼을 누르면 콜센터 번호와 접수 내용을 담은 문자 작성 화면이 열립니다. 내용을 확인한 뒤 문자 앱에서 전송을 눌러주세요.',smsGuideTitle:'문자 접수 안내',smsFallback:'일부 기기에서 본문이 자동 입력되지 않으면 ‘내용 복사’를 이용해 주세요.',operating:'실제 열차 수배와 관제 협조는 정보를 전달받은 역 또는 콜센터가 판단하고 진행합니다.',noResults:'조건에 맞는 열차를 찾지 못했어요. 하차 정보를 확인하거나 열차번호 없이 정보를 전달할 수 있습니다.',noCandidate:'열차번호 없이 정보 전달하기',edit:'하차·분실 정보 수정',stationUnavailable:'이 역의 열차 경로가 연결되지 않았습니다.',branches:'분기 구간은 후보가 실제로 지나갈 역을 추가 확인해야 합니다.',demo:'가상 열차 시연 · 실제 수배에 사용하지 마세요',station:'하차역',change:'변경',manual:'직접 입력',routePart:'하차역부터 현재 위치까지 추정 경로 일부',stopsAhead:'추정 후속역 (정차·연락 가능 여부 미확인)',info:'역 기준 실시간 위치·도착정보를 사용합니다.',refresh:'열차 위치는 20초마다 갱신됩니다.',needDirection:'열차가 떠난 방향을 선택해 주세요.'},
 en:{heroIn:'Tell us about your lost item',heroOut:'Checking train information',heroFound:'Possible trains found',heroEmpty:'No matching trains found',subtitle:'Enter your exit station, time, and item.',resultSubtitle:'Checking live train information.',resultSubtitleTop:'Check whether the selected train is yours.',resultSubtitleChosen:'Check whether the selected train is yours.',resultSubtitleEmpty:'Edit the details or continue without a train.',stepInput:'Trip and lost item',stepResult:'Trains and handoff',panelA:'Where and when did you get off?',panelB:'What and where was the item?',direction:'Which way did the train leave?',directionSub:'Next stop',elapsed:'How long ago did you get off?',mins:'min ago',custom:'Custom',minutes:'min',range:'Within 30 min',exact:'Enter exact alighting time',item:'Lost item',itemExample:'e.g. black backpack',carQuestion:'Car number',carUnit:'car',door:'Door number',unknown:'Unknown',doorUnit:'Door',place:'Where was it left?',seat:'Seat',rack:'Overhead rack',nearDoor:'Near door',floor:'Floor',required:'Required',optional:'Optional',search:'Find live train candidates',inputHint:'Enter the item, car, door and direction first.',searching:'Checking live train information',searchingInfo:'Waiting for actual API responses.',found:'Candidate trains',trains:'',rank:'First candidate to check',nextRank:'Other candidate',candidate:'Estimated train',train:'train',position:'Last reported at',corroborated:'Train number also seen in arrival reports',unverified:'Estimated from position; past route unverified',stopCount:'From alighting station',stops:'stops',choose:'Prepare handoff for this train',chosen:'Candidate selected',other:'Show other candidates',noneMatch:'None of these trains',fullMap:'Show full live train map',mapHint:'Station-level reports do not confirm past train movements.',handoff:'Your report is ready',handoffSub:'Review details, then open the text message.',handoffReview:'Review report details',trainChosen:'Candidate train',boarding:'Car position',lostItem:'Lost item',alighted:'Alighting details',message:'Handoff message',copy:'Copy details',copied:'Copied',smsTarget:'1577-1234',sms:'Text the call center',call:'Call 1577-1234',smsCaution:'This opens your SMS app with the call center number and a prepared message. Check the details, then tap Send in your SMS app.',smsGuideTitle:'Sending your report',smsFallback:'If the message is blank on your device, use Copy details to paste it.',operating:'The receiving staff or call center decide any train search or operational coordination.',noResults:'No matching live trains were found. Review your details or hand off without a train number.',noCandidate:'Handoff without train number',edit:'Edit trip and lost-item details',stationUnavailable:'No route graph is available for this station.',branches:'Branches can make future stops uncertain.',demo:'DEMO trains — do not report as real',station:'Alighting station',change:'Change',manual:'Custom',routePart:'Partial estimated route to reported position',stopsAhead:'Possible downstream stations (unverified)',info:'Uses station-level live train and arrival data.',refresh:'Live positions refresh about every 20 seconds.',needDirection:'Select the train direction.'},
 ja:{heroIn:'忘れ物の情報を入力してください',heroOut:'列車情報を確認しています',heroFound:'列車候補が見つかりました',heroEmpty:'列車候補が見つかりませんでした',subtitle:'下車駅・時刻と忘れ物を入力してください。',resultSubtitle:'列車の位置情報を確認中です。',resultSubtitleTop:'選択された列車をご確認ください。',resultSubtitleChosen:'選択された列車をご確認ください。',resultSubtitleEmpty:'情報を修正するか列車番号なしで連絡できます。',stepInput:'下車・忘れ物',stepResult:'列車確認・情報共有',panelA:'いつ、どこで降りましたか？',panelB:'何を、どこに忘れましたか？',direction:'列車はどちらに出発しましたか？',directionSub:'次の駅',elapsed:'降りてから何分ですか？',mins:'分前',custom:'直接入力',minutes:'分',range:'30分以内',exact:'下車時刻を直接入力',item:'忘れ物',itemExample:'例：黒いリュック',carQuestion:'乗車した車両番号',carUnit:'号車',door:'ドア番号',unknown:'不明',doorUnit:'番',place:'置いた場所',seat:'座席',rack:'棚',nearDoor:'ドア付近',floor:'床',required:'必須',optional:'任意',search:'列車候補を検索',inputHint:'忘れ物・車両・ドア・方向を入力してください。',searching:'リアルタイム情報を確認中',searchingInfo:'APIからの応答を待っています。',found:'候補列車',trains:'本',rank:'最初に確認する候補',nextRank:'次の候補',candidate:'推定列車',train:'列車',position:'最新確認駅',corroborated:'到着情報とも一致',unverified:'現在位置から推定・過去経路は未確認',stopCount:'下車駅から',stops:'駅',choose:'この列車の情報を準備',chosen:'選択済み',other:'ほかの候補を見る',noneMatch:'どの候補でもない',fullMap:'全列車の位置を表示',mapHint:'駅単位の位置情報で過去の通過駅は保証されません。',handoff:'連絡内容を準備しました',handoffSub:'内容を確認し、SMSで連絡してください。',handoffReview:'連絡内容の確認',trainChosen:'候補列車',boarding:'乗車位置',lostItem:'忘れ物',alighted:'下車情報',message:'連絡文',copy:'コピー',copied:'コピーしました',smsTarget:'1577-1234',sms:'SMSで届け出る',call:'1577-1234に電話',smsCaution:'ボタンを押すと、宛先と内容を設定したSMS作成画面が開きます。内容を確認してからSMSアプリで送信してください。',smsGuideTitle:'SMS送信について',smsFallback:'一部端末では本文が自動入力されません。その場合は「コピー」をご利用ください。',operating:'実際の列車捜索・運行調整は担当駅やコールセンターが判断します。',noResults:'候補がありません。情報を見直すか列車未確定で連絡してください。',noCandidate:'列車未確定で連絡',edit:'下車・忘れ物情報を修正',stationUnavailable:'この駅の経路情報は未対応です。',branches:'分岐区間は経路の確認が必要です。',demo:'架空列車のデモです',station:'下車駅',change:'変更',manual:'入力',routePart:'推定経路の一部',stopsAhead:'後続駅候補（未確認）',info:'駅単位の現在位置データを使用',refresh:'約20秒ごとに更新',needDirection:'方向を選択してください。'},
 zh:{heroIn:'请填写遗失物品信息',heroOut:'正在查询列车信息',heroFound:'已找到候选列车',heroEmpty:'未找到符合条件的列车',subtitle:'请输入下车站、时间及遗失物品。',resultSubtitle:'正在查询列车实时位置。',resultSubtitleTop:'请确认所选列车是否正确。',resultSubtitleChosen:'请确认所选列车是否正确。',resultSubtitleEmpty:'可修改信息或在未确认车次时提交。',stepInput:'下车与遗失信息',stepResult:'列车确认与转交',panelA:'何时何地下车？',panelB:'物品遗落在哪里？',direction:'列车驶往哪个方向？',directionSub:'下一站',elapsed:'下车多久了？',mins:'分钟前',custom:'手动输入',minutes:'分钟',range:'30分钟内',exact:'输入下车时刻',item:'遗失物品',itemExample:'例如：黑色背包',carQuestion:'乘坐的车厢编号',carUnit:'车厢',door:'车门编号',unknown:'不清楚',doorUnit:'号',place:'放置位置',seat:'座位',rack:'行李架',nearDoor:'车门附近',floor:'地板',required:'必填',optional:'选填',search:'查找实时列车候选',inputHint:'请填写物品、车厢、车门和方向。',searching:'正在查询实时列车信息',searchingInfo:'正在等待实际 API 响应。',found:'候选列车',trains:'列',rank:'优先查看',nextRank:'其他候选',candidate:'推测列车',train:'列车',position:'最近报告位置',corroborated:'与后续到站信息交叉核对',unverified:'位置推测·历史路线未确认',stopCount:'距下车站',stops:'站',choose:'准备转交此列车信息',chosen:'已选择',other:'查看更多候选',noneMatch:'都不是这些列车',fullMap:'查看全部实时列车图',mapHint:'站级位置数据不能证实历史经过路线。',handoff:'转交信息已准备好',handoffSub:'请核对内容后通过短信提交。',handoffReview:'核对提交信息',trainChosen:'候选列车',boarding:'乘车位置',lostItem:'遗失物品',alighted:'下车信息',message:'转交信息',copy:'复制',copied:'已复制',smsTarget:'1577-1234',sms:'向客服中心短信报失',call:'拨打 1577-1234',smsCaution:'点击按钮会打开已填写客服号码与接报内容的短信编辑界面。请核对内容后在短信应用中点击发送。',smsGuideTitle:'短信提交说明',smsFallback:'部分设备可能不会自动填写正文，此时可使用“复制短信”粘贴。',operating:'列车搜寻和运行协调由接收信息的车站或客服决定。',noResults:'未找到实时候选。请核对信息，或不填写车次直接转交。',noCandidate:'不确定车次也可转交',edit:'修改下车与遗失信息',stationUnavailable:'此站暂不支持路线图。',branches:'支线区段需进一步核实路线。',demo:'虚拟列车演示，勿用于实际报失',station:'下车站',change:'更改',manual:'手动',routePart:'部分推测行车路线',stopsAhead:'后续车站候选（未确认）',info:'使用站级实时列车位置数据',refresh:'约每20秒更新',needDirection:'请选择行车方向。'}
};
const compareNo=x=>String(x||'').replace(/^0+(?=\d)/,'');
const sliderWords={
 ko:{now:'방금',prompt:'내린 지 얼마나 지났나요?',range:'(0~30분)',manual:'시각 입력',manualSelected:'직접 입력',exact:'정확한 하차 시각'},
 en:{now:'Just now',prompt:'Time since exit?',range:'(0–30 min)',manual:'Set time',manualSelected:'Set time',exact:'Exact exit time'},
 ja:{now:'たった今',prompt:'降車から何分ですか？',range:'(0〜30分)',manual:'時刻入力',manualSelected:'時刻入力',exact:'正確な降車時刻'},
 zh:{now:'刚刚',prompt:'下车多久了？',range:'(0~30分钟)',manual:'输入时间',manualSelected:'输入时间',exact:'准确下车时间'}
};
// Compact display labels for four choices in a single mobile row. The full
// localized wording is retained for accessibility and handoff messages.
const shortPlaceLabels={
 ko:{seat:'좌석',rack:'선반',nearDoor:'문근처',floor:'바닥'},
 en:{seat:'Seat',rack:'Rack',nearDoor:'Door',floor:'Floor'},
 ja:{seat:'座席',rack:'棚',nearDoor:'ドア',floor:'床'},
 zh:{seat:'座位',rack:'行李架',nearDoor:'车门',floor:'地板'},
};
const branchWarningLabel={
 ko:'분기 경로 확인 필요',en:'Check branch route',
 ja:'分岐経路の確認が必要',zh:'需确认支线路径'
};
const localized=(name,line,lang)=>stationName(trainStationDisplay(line,name),lang)||name;
const candidateRankLabel=(index,lang)=>lang==='ko'?'추정 '+(index+1)+'순위':lang==='ja'?'推定 第'+(index+1)+'候補':lang==='zh'?'推测第'+(index+1)+'候选':'Estimated #'+(index+1);

const flowCopy={
 ko:{steps:['정보 입력','열차 확인','수배 요청'],requiredMissing:'필수 입력 필요',requiredReady:'입력 완료 · 열차 확인을 눌러주세요',requiredCar:'탑승 칸',requiredDirection:'진행 방향',requiredDoor:'출입문',requiredItem:'분실 물품',time:'하차 시각',timeGuide:'선택한 시간은 열차 검색 시점에 다시 계산됩니다.',timeExact:'하차 시각 직접 수정',additional:'물건을 둔 곳 (선택)',candidateCount:'실시간 후보',candidatePrompt:'탑승했던 것으로 생각되는 열차를 선택해 주세요',candidateHelp:'후보를 누르면 아래 배치도에서 해당 열차를 강조합니다.',mapTitle:'실시간 열차 위치',mapInstruction:'다른 열차라면 아래 후보를 선택해 주세요.',confirm:'선택한 열차 정보로 계속하기',selectHint:'위의 후보 열차를 선택해 주세요.',positionExplain:'최근 확인 위치는 실시간 열차정보에 마지막으로 기록된 역입니다. 실제 위치와 차이가 있을 수 있으며, 후보는 탑승 열차로 확정되지 않았습니다.',chosenPosition:'선택한 열차 최근 위치',fallback:'열차번호 없이 전달하기',handoffBack:'← 열차 위치 다시 확인',quickEdit:'← 입력 정보 수정',secondary:'후보는 실제 탑승 열차로 확정되지 않았습니다.',noCandidate:'실시간 후보가 없더라도 하차·분실 정보를 전달할 수 있습니다.',timeRef:'검색에 적용할 하차 시각'},
 en:{steps:['Enter details','Find the train','Handoff'],requiredMissing:'Required fields missing',requiredReady:'Ready · tap Find the train',requiredCar:'Car',requiredDirection:'Direction',requiredDoor:'Door',requiredItem:'Lost item',time:'Alighting time',timeGuide:'Relative time is recalculated when you start the search.',timeExact:'Edit exact alighting time',additional:'Where item was left (optional)',candidateCount:'Live candidates',candidatePrompt:'Select the train you think you were on',candidateHelp:'Tap a candidate to focus it in the live train diagram.',mapTitle:'Live train positions',mapInstruction:'If needed, choose another train below.',confirm:'Continue with this train',selectHint:'Choose a candidate train above.',positionExplain:'Last reported position means the station most recently recorded by the live feed; the train may have moved. Candidates are not confirmed boarding records.',chosenPosition:'Selected train last seen',fallback:'Handoff without a confirmed train',handoffBack:'← Back to live train view',quickEdit:'← Edit information',secondary:'A candidate is not a verified boarding record.',noCandidate:'You can still hand off details without a train number.',timeRef:'Alighting time used in search'},
 ja:{steps:['情報入力','列車確認','連絡内容'],requiredMissing:'必須項目が未入力',requiredReady:'入力完了 · 列車確認へ',requiredCar:'車両位置',requiredDirection:'進行方向',requiredDoor:'ドア',requiredItem:'忘れ物',time:'下車時刻',timeGuide:'「何分前」は検索時点で再計算されます。',timeExact:'正確な下車時刻を入力',additional:'忘れ物を置いた場所（任意）',candidateCount:'列車候補',candidatePrompt:'乗車したと思われる列車を選んでください',candidateHelp:'候補を押すと下の列車位置図で強調します。',mapTitle:'リアルタイム列車位置',mapInstruction:'別の列車の場合は下の候補を選んでください。',confirm:'この列車の情報で続ける',selectHint:'上の候補列車を選んでください。',positionExplain:'最新確認駅は列車位置情報に最後に記録された駅です。実際の位置とは異なる場合があり、乗車した列車と確定したわけではありません。',chosenPosition:'選択列車の最新確認位置',fallback:'列車番号未確定で連絡',handoffBack:'← 列車位置に戻る',quickEdit:'← 情報を修正',secondary:'候補は乗車列車として確定していません。',noCandidate:'列車番号なしでも忘れ物情報を連絡できます。',timeRef:'検索に使用する下車時刻'},
 zh:{steps:['填写信息','确认列车','转交信息'],requiredMissing:'必填项未完成',requiredReady:'填写完成 · 点击确认列车',requiredCar:'车厢',requiredDirection:'行驶方向',requiredDoor:'车门',requiredItem:'遗失物品',time:'下车时间',timeGuide:'搜索时会重新计算“几分钟前”。',timeExact:'修改准确下车时间',additional:'物品放置位置（选填）',candidateCount:'实时候选',candidatePrompt:'请选择您可能乘坐的列车',candidateHelp:'点击候选列车，在下方实时图中突出显示。',mapTitle:'列车实时位置',mapInstruction:'如不是该列车，请选择下方其他候选。',confirm:'用所选列车继续',selectHint:'请选择上方的候选列车。',positionExplain:'最近报告位置是实时数据最后记录的车站，列车可能已继续行驶。候选列车不代表已确认的乘车记录。',chosenPosition:'所选列车最近位置',fallback:'无法确认车次时转交',handoffBack:'← 返回实时列车图',quickEdit:'← 修改信息',secondary:'候选列车不代表实际乘车记录。',noCandidate:'没有车次也可以转交遗失信息。',timeRef:'搜索使用的下车时间'}
};
export default function TrainLostUI(p){
 const {lang='ko',t,active,demoMode,selection,selectionLabel,lines,neighbors,requiredDirection,matches,
 editing,setEditing,query,setQuery,chooseStation,next,setNext,when,setWhen,quickMin,setQuickMin,korea,kstAlightDateForTime,resetMatches,
 busy,error,candidates,chosen,current,searched,lookupStats,directionWarning,pick,livePositions,liveFetchedAt,onLiveSnapshot,
 onSearch,onBack,onNone,onContinue,onBackToResults,carNumber,setCarNumber,thing,setThing,door,setDoor,place,setPlace,
 stage,onStageChange,handoffUnknown,message,sms,copyMessage,copyStatus,recommended,liveInfo}=p;
 const u=dictionary[lang]||dictionary.ko;
 const v=flowCopy[lang]||flowCopy.ko;
 const w=sliderWords[lang]||sliderWords.ko;
 const carLabel=carNumber?(lang==='en'?'Car '+carNumber:lang==='zh'?'第'+carNumber+'车厢':carNumber+u.carUnit):'';
 const doorLabel=lang==='en'?u.doorUnit+' '+door:door+u.doorUnit;
 const missingRequired=[
  !neighbors.length&&u.station,
  (!when.date||!when.time)&&v.time,
  (!next||requiredDirection===null)&&v.requiredDirection,
  !thing.trim()&&v.requiredItem,
  !carNumber&&v.requiredCar,
  !door&&v.requiredDoor
 ].filter(Boolean);
 const canSearch=missingRequired.length===0;
 const manualElapsed=Math.round((Date.now()-Date.parse(when.date+'T'+when.time+':00+09:00'))/60000);
 const sliderMinutes=quickMin===null?(Number.isFinite(manualElapsed)?Math.max(0,Math.min(30,manualElapsed)):5):quickMin;
 const pickElapsed=n=>{setQuickMin(n);setWhen(korea(n));resetMatches();};
 const way=next?localized(next,selection.line,lang):'';
 const displayTime=when.time;
 const stageNumber=stage==='input'?1:stage==='results'?2:3;
 const firstCandidate=Boolean(chosen&&candidates.length&&compareNo(chosen.number)===compareNo(candidates[0].number));
 const resultsTitle=!searched||busy?u.heroOut:candidates.length?u.heroFound:u.heroEmpty;
 const resultsSubtitle=!searched||busy?u.resultSubtitle:candidates.length?(chosen?(firstCandidate?u.resultSubtitleTop:u.resultSubtitleChosen):u.resultSubtitle):u.resultSubtitleEmpty;
 const closeStation=()=>setEditing(!editing);
 return <div className="tf-root tf-redesign tl-three-stage">
  <section className="tl-hero"><h2>{stage==='input'?u.heroIn:stage==='results'?resultsTitle:u.handoff}</h2><p>{stage==='input'?u.subtitle:stage==='results'?resultsSubtitle:u.handoffSub}</p></section>
  <nav className="tl-stepbar" aria-label={v.steps.join(' → ')}>
   {v.steps.map((label,i)=>{
    const target=['input','results','handoff'][i];
    const available=i===0||(i===1&&(searched||(stage==='input'&&canSearch)))||(i===2&&searched&&(chosen||handoffUnknown));
    const goToStep=()=>{if(i===1&&stage==='input')onSearch();else onStageChange(target);};
    const showTrip=stage==='results'&&i===0;
    const tripText=lineName(selection.line+'호선',lang)+' · '+selectionLabel+' → '+way+' · '+v.time+' '+displayTime;
    return <button type="button" key={label}
     className={'tl-step'+(showTrip?' tl-step-with-trip':'')+(i+1===stageNumber?' current':i+1<stageNumber?' done':'')+(stage==='input'&&canSearch?(i===0?' complete':i===1?' next-ready':''):'')}
     aria-current={i+1===stageNumber?'step':undefined}
     aria-label={showTrip?label+' · '+tripText+' · '+u.change:undefined}
     title={showTrip?tripText+' · '+u.change:undefined}
     disabled={busy||!available} onClick={goToStep}>
     <span className="tl-step-heading"><b>{i+1<stageNumber?'✓':i+1}</b><span>{label}</span>{showTrip&&<span className="tl-step-pencil" aria-hidden="true">✎</span>}</span>
     {showTrip&&<span className="tl-step-trip-detail" style={{'--tl-line-color':pickerLineColor(selection.line)}}>
      <span className="tl-step-trip-station"><span className="tl-step-trip-line">{String(selection.line).replace(/^0/,'')}</span><span className="tl-step-trip-origin">{selectionLabel}</span></span>
      <span className="tl-step-trip-destination">→ {way}</span>
      <span className="tl-step-trip-clock">◷ {displayTime}</span>
     </span>}
    </button>;
   })}
  </nav>
  {stage==='input'&&<div className={'tl-required-status'+(canSearch?' ready':' missing')} role="status" aria-live="polite">
   <span aria-hidden="true">{canSearch?'✓':'!'}</span>
   <span>{canSearch?v.requiredReady:v.requiredMissing+' ('+missingRequired.length+') · '+missingRequired.join(' · ')}</span>
  </div>}
  {demoMode&&<p className="tf-warning">DEMO · {u.demo}</p>}
  {stage==='input'&&<>
   <section className="tl-panel tl-input-panel">
    <h3 className="tl-panel-title"><em>01</em>{u.panelA}</h3>
    <div className="tl-field tl-station-field">
     <div className="tl-station-layout">
      <div className="tl-station-column tl-station-inline-field">
       <div className="tl-label">{u.station}</div>
       <button type="button" className="tl-station-trigger" onClick={closeStation} aria-label={u.station+': '+selectionLabel+' · '+u.change} aria-expanded={editing}>
        <strong className="tl-station-value">{selectionLabel}</strong><span className="tl-station-edit-icon" aria-hidden="true">⌕</span>
       </button>
      </div>
      <div className="tl-station-column tl-station-inline-field">
       <label className="tl-label" htmlFor={lines.length>1?'tl-station-line':undefined}>{t.line}</label>
       {lines.length>1?<select id="tl-station-line" className="tl-station-line-select" value={selection.line} onChange={e=>chooseStation({name:selection.name,line:e.target.value})} aria-label={t.line}>
        {lines.map(l=><option key={l} value={l}>{lineName(l+'호선',lang)}</option>)}
       </select>:<div className="tl-station-line-static">{lineName(selection.line+'호선',lang)}</div>}
      </div>
     </div>
     {editing&&<div className="tl-picker tl-station-search-panel">
      <div className="tl-picker-heading"><strong>{t.search}</strong><button type="button" onClick={closeStation} aria-label={u.close||'닫기'}>×</button></div>
      <label className="tl-picker-search"><span aria-hidden="true">⌕</span><input type="search" value={query} placeholder={t.search} onChange={e=>setQuery(e.target.value)} aria-label={t.search} autoComplete="off"/></label>
      {matches.length>0&&<div className="tf-matches" role="listbox" aria-label={t.search}>{matches.map(s=><button type="button" key={s.name+'/'+s.line} role="option" aria-selected={selection.name===s.name&&selection.line===s.line} onClick={()=>chooseStation(s)} style={{'--tl-line-color':pickerLineColor(s.line)}}><span className="tl-picker-line">{String(s.line).replace(/^0/,'')}</span><strong>{s.display}</strong><span className="tl-picker-arrow" aria-hidden="true">↗</span></button>)}</div>}
     </div>}
    </div>
    {!neighbors.length&&<p className="tf-warning">{u.stationUnavailable}</p>}
    <div className="tl-field tl-direction-field"><div className="tl-label">{u.direction}<span className="tl-required">{u.required}</span></div><div className={'tl-directions'+(neighbors.length===1?' tl-directions-single':'')} role="group" aria-label={u.direction}>{neighbors.map((st,i)=><button type="button" className="tl-choice" key={st} aria-pressed={next===st} aria-label={localized(st,selection.line,lang)+' · '+u.directionSub} onClick={()=>{if(next!==st){setNext(st);resetMatches();}}}><span className="tl-direction-arrow" aria-hidden="true">{i===0?'←':i===1?'→':'↗'}</span><strong>{localized(st,selection.line,lang)}</strong><small>{u.directionSub}</small>{next===st&&<span className="tl-direction-check" aria-hidden="true">✓</span>}</button>)}</div>{next&&requiredDirection===null&&<p className="tf-warning">{u.needDirection}</p>}{neighbors.length>2&&<p className="tl-note">{u.branches}</p>}</div>
    <div className="tl-field tl-time-field">
     <div className="tl-time-meter">
     <div className="tl-time-topline">
      <div className="tl-time-prompt"><span className="tl-time-question">{w.prompt}</span><span className="tl-time-range">{w.range}</span><span className="tl-required" aria-label={u.required}>*</span></div>
      <strong className="tl-time-value" aria-live="off">{quickMin===null?w.manualSelected:quickMin===0?w.now:quickMin+u.mins}</strong>
     </div>
     <div className="tl-times">{[3,5,10,15].map(n=><button type="button" className="tl-chip" key={n} aria-pressed={quickMin===n} onClick={()=>pickElapsed(n)}>{n}{u.mins}</button>)}<button type="button" className="tl-chip tl-chip-manual" aria-pressed={quickMin===null} aria-expanded={quickMin===null} onClick={()=>setQuickMin(null)}>{w.manual}</button></div>
     <input className="tl-time-slider" type="range" min="0" max="30" step="1" value={sliderMinutes} style={{'--tl-slider-fill':sliderMinutes/30*100+'%'}} aria-label={u.elapsed} aria-valuetext={quickMin===null?w.manualSelected:sliderMinutes===0?w.now:sliderMinutes+u.mins} onChange={e=>pickElapsed(Number(e.target.value))}/>
     </div>
     {quickMin===null&&<label className="tl-time-summary tl-time-edit"><span>{w.exact}</span><span className="tl-time-edit-control"><input type="time" required aria-label={v.timeExact} value={when.time} onChange={e=>{if(!e.target.value)return;setWhen({date:kstAlightDateForTime(e.target.value),time:e.target.value});resetMatches();}}/></span></label>}
    </div>
   </section>
   <section className="tl-panel tl-input-panel">
    <h3 className="tl-panel-title"><em>02</em>{u.panelB}</h3>
    <div className="tl-item-place-row">
     <div className="tl-field tl-item-field">
      <label className="tl-label" htmlFor="tl-item">{u.item}<span className="tl-required">{u.required}</span></label>
      <input className="tl-input" id="tl-item" type="text" value={thing} maxLength={80} placeholder={u.itemExample} onChange={e=>setThing(e.target.value)}/>
     </div>
     <div className="tl-field tl-place-field">
      <div className="tl-label">{u.place}<span className="tl-optional">{u.optional}</span></div>
      <div className="tl-mini-list" role="group" aria-label={u.place}>{['seat','rack','nearDoor','floor'].map(id=><button type="button" key={id} aria-label={u[id]} aria-pressed={place===id} onClick={()=>setPlace(place===id?'':id)}>{shortPlaceLabels[lang]?.[id]||u[id]}</button>)}</div>
     </div>
    </div>
    <div className="tl-field tl-car-door-field">
     <div className="tl-label">{u.carQuestion}<span className="tl-required">{u.required}</span></div>
     <div className="tl-cars" role="group" aria-label={u.carQuestion}>{Array.from({length:10},(_,i)=>String(i+1)).map(n=><button type="button" className="tl-car" key={n} aria-pressed={carNumber===n} aria-label={n+u.carUnit} onClick={()=>setCarNumber(n)}>{n}<small>{u.carUnit}</small></button>)}</div>
     <div className="tl-door-block">
      <div className="tl-label">{u.door}<span className="tl-required">{u.required}</span></div>
      <div className="tl-door-options" role="group" aria-label={u.door}>{['1','2','3','4'].map(n=><button type="button" key={n} aria-pressed={door===n} onClick={()=>setDoor(n)}>{lang==='en'?u.doorUnit+' '+n:n+u.doorUnit}</button>)}</div>
     </div>
    </div>
   </section>
   <div className="tl-search-footer"><button type="button" className="tl-primary" disabled={!canSearch} onClick={onSearch}>{u.search} →</button><p className="tl-footer-hint">{canSearch?v.timeRef+': '+displayTime:u.inputHint}</p></div>
  </>}
  {stage==='results'&&<>
   {busy&&<div className="tl-searching" role="status"><div className="tl-spinner"/><div><strong>{u.searching}</strong><p>{u.searchingInfo}</p></div></div>}
   {error&&<div className="tf-warning" role="alert">{error}</div>}
   {searched&&!error&&!busy&&<div className="tl-live-map-main">
    <TrainLiveDiagram sectionTitle={v.mapTitle} instruction={candidates.length?v.mapInstruction:''} line={selection.line} station={selection.name} next={next} lang={lang} positions={livePositions} fetchedAt={liveFetchedAt} candidates={candidates} selected={chosen} active={active} demo={demoMode} onSnapshot={onLiveSnapshot} onPick={pick}/>
   </div>}
   {!busy&&searched&&!error&&candidates.length>0&&<div className={'tl-candidate-strip'+(chosen?' has-selection':'')} role="group" aria-label={v.candidateCount}>
    {candidates.map((c,index)=>{const selected=compareNo(chosen?.number)===compareNo(c.number);
     return <button type="button" key={c.number+'/'+index} aria-pressed={selected} onClick={()=>pick(c)} className={'tl-candidate-chip'+(selected?' selected':'')}>
      <span className="tl-candidate-toprow"><span className={'tl-candidate-rank'+(index===0?' tl-candidate-rank-first':'')}>{candidateRankLabel(index,lang)}</span></span>
      <span className="tl-candidate-identity"><strong>#{c.number}</strong></span>{selected&&<span className="tl-candidate-check" aria-hidden="true">✓</span>}<span className="tl-candidate-location"><small>{u.position}</small><b>{localized(current&&selected?current.station:c.station,selection.line,lang)}</b></span>
      {c.branched&&<small className="tl-branch-caution">⚠ {branchWarningLabel[lang]||branchWarningLabel.ko}</small>}
     </button>;
    })}
   </div>}
   {!busy&&searched&&!error&&candidates.length===0&&<div className="tl-empty">{u.noResults}{lookupStats&&lang==='ko'?' · API '+(lookupStats.usableRows??'-')+'건':''} <p>{v.noCandidate}</p></div>}
   {directionWarning&&<p className="tl-note">{t.directionUnknown}</p>}
   {!busy&&<section className="tl-next-panel">
    {chosen?<><button type="button" className="tl-primary" onClick={onContinue}>{v.confirm} →</button></>:
    <><p className="tl-select-instruction">{candidates.length>0?v.selectHint:v.noCandidate}</p><button type="button" className="tl-primary tl-secondary-primary" onClick={onNone}>{v.fallback} →</button></>}
    {chosen&&<button type="button" className="tl-text-option" onClick={onNone}>{v.fallback}</button>}
   </section>}
  </>}
  {stage==='handoff'&&<>
   <section className="tl-panel tl-handoff">
    <div className="tl-handoff-head"><span className="tl-handoff-icon">↗</span><div><h3>{u.handoffReview}</h3></div></div>
    <div className="tl-handoff-grid">
     <div className="tl-handoff-cell"><small>{u.trainChosen}</small><strong>{chosen?'#'+chosen.number+' · '+u.candidate:u.unknown}</strong></div>
     <div className="tl-handoff-cell"><small>{u.boarding}</small><strong>{carNumber+'-'+door+' ('+carLabel+' · '+doorLabel+')'}</strong></div>
     <div className="tl-handoff-cell"><small>{u.lostItem}</small><strong>{thing}</strong></div>
     <div className="tl-handoff-cell"><small>{u.alighted}</small><strong>{selectionLabel} · {displayTime}</strong></div>
    </div>
    {chosen&&recommended.stations.length>0&&<p className="tl-note">{u.stopsAhead}: {recommended.stations.map(st=>localized(st,selection.line,lang)).join(' · ')}</p>}
    {liveInfo&&<p className="tf-warning">{liveInfo}</p>}
    <div className="tl-message-heading"><div className="tl-label">{u.message}</div><button type="button" className="tl-copy-compact" onClick={copyMessage}>{copyStatus?'✓ '+u.copied:u.copy}</button></div>
    <div className="tl-message">{message}</div>
    <button type="button" className="tl-sms-primary" onClick={sms}><span className="tl-sms-primary-action"><span aria-hidden="true">✉</span><strong>{u.sms}</strong></span><span className="tl-sms-primary-recipient">{u.smsTarget}</span></button>
    <div className="tl-handoff-notices"><p><span className="tl-handoff-notice-icon" aria-hidden="true">✓</span><span><strong>{u.smsGuideTitle}</strong>{u.smsCaution}</span></p><p><span className="tl-handoff-notice-icon" aria-hidden="true">!</span><span>{u.smsFallback}</span></p><p><span className="tl-handoff-notice-icon" aria-hidden="true">ℹ</span><span>{u.operating}</span></p></div>
   </section>
   <div className="tl-reset-row"><button type="button" className="tl-secondary" onClick={onBackToResults}>{v.handoffBack}</button><button type="button" className="tl-secondary" onClick={onBack}>{v.quickEdit}</button></div>
  </>}
  
 </div>;
}
