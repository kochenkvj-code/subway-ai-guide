'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import GuideExperience from '../components/GuideExperience';
import UnifiedRouteLab from '../v2/route-lab/RouteLab';
import usePositionArrivals from '../v2/usePositionArrivals';
import {PositionTrainSummary,PositionArrivalDetails} from '../v2/PositionArrivals';
import NearbyTour from '../v2/NearbyTour';
import CompactLostFound from '../v2/lost-found-demo/CompactLostFound';
import TrainLostFinder from '../v2/TrainLostFinder';
import TrainTimetable from '../v2/TrainTimetable';
import FacilityDemo from '../v2/facilities-demo/FacilityDemo';
import StationFeedback from '../v2/StationFeedback';
import {copy,menuItems} from '../v2/copy';
import {iconPaths} from '../v2/icons';
import {FEEDBACK_STATIONS,DEFAULT_FEEDBACK_STATION} from '../lib/feedback-config';
import {lostFoundStation} from '../lib/lost-found-stations';
import {getStationByCode,searchStationMaster} from '../lib/station-master';
import {readStationEntry} from '../lib/station-entry';
import '../v2/v2.css';
import '../v2/design-refresh.css';
import '../v2/position-arrivals.css';
import './wide.css';

const flags=[{code:'ko',flag:'🇰🇷',label:'한국어'},{code:'en',flag:'🇺🇸',label:'English'},{code:'ja',flag:'🇯🇵',label:'日本語'},{code:'zh',flag:'🇨🇳',label:'中文'}];
const locale={ko:'ko-KR',en:'en-US',ja:'ja-JP',zh:'zh-CN'};
const labels={
 ko:{station:'기준역',choose:'역 변경',search:'역명 또는 역 코드 검색',close:'닫기',guide:'빠른 안내',chat:'AI 고객안내',live:'실시간 열차정보',speech:'음성으로 질문',stop:'음성입력 중지',typing:'키보드로 질문',ask:'질문 보내기',preview:'인식된 문장을 확인하고 전송하세요.',listening:'듣고 있어요. 질문을 말씀해 주세요.',speechError:'음성인식에 실패했습니다. 다시 시도해 주세요.',speechUnsupported:'이 브라우저에서는 음성인식이 지원되지 않습니다. 키보드를 이용해 주세요.',micPermission:'마이크 사용을 허용해 주세요.',placeholder:'궁금한 점을 질문하거나 마이크를 눌러 말씀하세요.',idle:'이용을 계속하시겠습니까?',idleDesc:'잠시 후 질문 기록이 초기화됩니다.',continue:'계속 이용',reset:'처음부터',back:'전체 메뉴',full:'전체화면',ready:'질문을 보내면 AI가 답변합니다.',privacy:'개인정보는 입력하지 마세요. 질문은 외부 AI 서비스로 전송·저장됩니다.',noStation:'지원하지 않는 역사 주소입니다.',searchEmpty:'검색된 역이 없습니다.',help:'질문을 말하거나 직접 입력해 주세요.',mode:'대화면 모드'},
 en:{station:'Station',choose:'Change station',search:'Search station or code',close:'Close',guide:'Quick guide',chat:'Ask AI',live:'Live train arrivals',speech:'Speak your question',stop:'Stop listening',typing:'Type your question',ask:'Send question',preview:'Review the recognized text before sending.',listening:'Listening. Please speak.',speechError:'Speech recognition failed. Please try again.',speechUnsupported:'Speech input is unavailable here. Please type your question.',micPermission:'Please allow microphone access.',placeholder:'Type your question or tap the microphone.',idle:'Still using this screen?',idleDesc:'Your questions will be cleared shortly.',continue:'Continue',reset:'Start over',back:'All guides',full:'Fullscreen',ready:'Ask a question to get help from AI.',privacy:'Do not enter personal information. Questions are sent to external AI and stored.',noStation:'Unsupported station.',searchEmpty:'No stations found.',help:'Speak or type your question.',mode:'Wide View'},
 ja:{station:'基準駅',choose:'駅を変更',search:'駅名・駅コードで検索',close:'閉じる',guide:'クイック案内',chat:'AIに質問',live:'リアルタイム列車情報',speech:'音声で質問',stop:'音声入力を停止',typing:'文字で質問',ask:'質問を送信',preview:'認識された文章を確認して送信してください。',listening:'聞き取り中です。話してください。',speechError:'音声認識に失敗しました。',speechUnsupported:'このブラウザでは音声入力を利用できません。文字で入力してください。',micPermission:'マイクの使用を許可してください。',placeholder:'質問を入力するか、マイクを押して話してください。',idle:'ご利用を続けますか？',idleDesc:'まもなく質問履歴が消去されます。',continue:'続ける',reset:'最初から',back:'案内一覧',full:'全画面',ready:'質問するとAIがお答えします。',privacy:'個人情報を入力しないでください。質問は外部AIに送信・保存されます。',noStation:'対応していない駅です。',searchEmpty:'該当する駅がありません。',help:'音声または文字で質問してください。',mode:'ワイドビュー'},
 zh:{station:'基准站',choose:'更换车站',search:'搜索车站名称或代码',close:'关闭',guide:'快捷指南',chat:'AI问答',live:'实时列车到站',speech:'语音提问',stop:'停止录音',typing:'键盘输入',ask:'发送问题',preview:'请确认识别的文字后发送。',listening:'正在聆听，请开始说话。',speechError:'语音识别失败，请重试。',speechUnsupported:'此浏览器不支持语音输入，请使用键盘。',micPermission:'请允许使用麦克风。',placeholder:'输入问题或点击麦克风提问。',idle:'继续使用吗？',idleDesc:'提问记录即将清除。',continue:'继续',reset:'重新开始',back:'全部指南',full:'全屏',ready:'输入问题，AI将为您解答。',privacy:'请勿输入个人信息。问题将发送至外部AI并保存。',noStation:'不支持此车站。',searchEmpty:'未找到车站。',help:'请通过语音或文字提问。',mode:'宽屏模式'}
};
function Icon({name,size=22}){return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{__html:iconPaths[name]||iconPaths.train}}/>;}
const MIC=<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 10.5v1.5a6.5 6.5 0 0 0 13 0v-1.5M12 18.5v3M8.5 21.5h7"/></svg>;
function WideGuide({station,lang,setLang,setStationCode}){
 const [left,setLeft]=useState('home');
 const [session,setSession]=useState(0);
 const [draft,setDraft]=useState('');
 const [chatRequest,setChatRequest]=useState(null);
 const [busy,setBusy]=useState(false);
 const [listening,setListening]=useState(false);
 const [speechError,setSpeechError]=useState('');
 const [speechSupported,setSpeechSupported]=useState(true);
 const [searchOpen,setSearchOpen]=useState(false);
 const [stationQuery,setStationQuery]=useState('');
 const [idleRemaining,setIdleRemaining]=useState(120);
 const [routeRequest,setRouteRequest]=useState(null);
 const activity=useRef(Date.now()),seq=useRef(0),speech=useRef(null);
 const t=labels[lang],source=copy[lang];
 const arrivals=usePositionArrivals(true,station.stationCode);
 const stationName=station.names?.[lang]||station.names?.ko||'';
 const feedbackStation=FEEDBACK_STATIONS[station.stationCode]||DEFAULT_FEEDBACK_STATION;
 const foundStation=lostFoundStation(station.stationCode);
 const [lastStation,setLastStation]=useState(station.stationCode);

 const stopVoice=useCallback(()=>{
  const recog=speech.current;speech.current=null;
  if(recog){recog.onend=null;recog.onresult=null;recog.onerror=null;try{recog.abort();}catch{}}
  setListening(false);
 },[]);
 const reset=useCallback(()=>{
  stopVoice();setLeft('home');setSession(n=>n+1);setDraft('');setChatRequest(null);setBusy(false);
  setSpeechError('');setSearchOpen(false);setStationQuery('');setRouteRequest(null);
  setLang('ko');activity.current=Date.now();setIdleRemaining(120);
 },[stopVoice,setLang]);
 useEffect(()=>{if(lastStation!==station.stationCode){setLastStation(station.stationCode);stopVoice();setLeft('home');setSession(n=>n+1);setChatRequest(null);setDraft('');setRouteRequest(null);activity.current=Date.now();}},[station.stationCode,lastStation,stopVoice]);
 useEffect(()=>{setSpeechSupported(Boolean(window.SpeechRecognition||window.webkitSpeechRecognition));return()=>stopVoice();},[stopVoice]);
 useEffect(()=>{
  const touch=()=>{activity.current=Date.now();setIdleRemaining(120);};
  for(const event of ['pointerdown','keydown','input','wheel','touchstart'])document.addEventListener(event,touch,{passive:true,capture:true});
  const timer=window.setInterval(()=>{
   if(busy||listening){activity.current=Date.now();setIdleRemaining(120);return;}
   const remaining=Math.max(0,120-Math.floor((Date.now()-activity.current)/1000));
   setIdleRemaining(remaining);
   if(remaining===0)reset();
  },1000);
  return()=>{window.clearInterval(timer);for(const event of ['pointerdown','keydown','input','wheel','touchstart'])document.removeEventListener(event,touch,true);};
 },[busy,listening,reset]);
 function changeLanguage(next){
  if(next===lang)return;stopVoice();setSpeechError('');setDraft('');setLang(next);
  const url=new URL(window.location.href);url.searchParams.set('lang',next);window.history.replaceState(window.history.state,'',url.pathname+url.search);
 }
 function sendQuestion(value){
  const message=value.trim();
  if(!message||busy)return;
  stopVoice();setChatRequest({id:++seq.current,text:message});setDraft('');
  activity.current=Date.now();setIdleRemaining(120);
 }
 function openMenu(id,options={}){
  setLeft(id);setRouteRequest(id==='route'&&options.routeQuery?{id:++seq.current,query:options.routeQuery}:null);
  activity.current=Date.now();setIdleRemaining(120);
 }
 function startVoice(){
  if(listening){stopVoice();return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){setSpeechError(t.speechUnsupported);return;}
  if(busy)return;
  stopVoice();setSpeechError('');
  const recognition=new Recognition();
  recognition.lang=locale[lang];recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
  const original=draft.trim();speech.current=recognition;
  recognition.onresult=e=>{
   let text='';for(let i=0;i<e.results.length;i++)text+=(e.results[i]?.[0]?.transcript||'')+' ';
   text=text.trim();if(text)setDraft(original?original+' '+text:text);
   activity.current=Date.now();
  };
  recognition.onerror=e=>{if(e.error!=='aborted')setSpeechError(e.error==='not-allowed'?t.micPermission:t.speechError);speech.current=null;setListening(false);};
  recognition.onend=()=>{if(speech.current===recognition)speech.current=null;setListening(false);};
  try{recognition.start();setListening(true);}catch{speech.current=null;setListening(false);setSpeechError(t.speechError);}
 }
 function chooseStation(code){
  setStationCode(code);setSearchOpen(false);setStationQuery('');
  const url=new URL(window.location.href);url.searchParams.set('station',code);url.searchParams.set('lang',lang);window.history.replaceState(window.history.state,'',url.pathname+url.search);
 }
 const results=searchStationMaster(stationQuery).slice(0,50);
 const leftTitle=left==='live'?t.live:source.menu[menuItems.findIndex(x=>x.id===left)]||t.guide;

 return <main className="wide-root v2-app v2-design-refresh" lang={locale[lang]}>
  <header className="wide-header">
   <div className="wide-brand"><div className="wide-symbol"><Icon name="train" size={27}/></div><div><span>SUBWAY AI GUIDE <b>· WIDE VIEW</b></span><h1>{stationName} <span className="wide-line-pill" style={{background:station.color}}>{station.line}</span></h1></div></div>
   <div className="wide-header-actions"><button className="wide-station-button" onClick={()=>{setStationQuery('');setSearchOpen(true);}}><Icon name="route" size={18}/>{t.choose}</button><button onClick={reset} className="wide-reset-button"><Icon name="home" size={18}/>{t.reset}</button></div>
  </header>
  <div className="wide-top">
   <section className="wide-arrivals" aria-label={t.live}>
    <div className="wide-top-caption"><Icon name="train" size={18}/><strong>{t.live}</strong><span>{stationName}</span></div>
    <PositionTrainSummary stationContext={station} state={arrivals} lang={lang} t={source} onDetails={()=>openMenu('live')}/>
   </section>
   <section className="wide-languages" aria-label={source.language}>
    <div className="wide-top-caption"><strong>LANGUAGE</strong><span>언어 선택 · Select your language</span></div>
    <div className="wide-language-grid">{flags.map(f=><button key={f.code} className={'wide-language '+(lang===f.code?'selected':'')} aria-pressed={lang===f.code} onClick={()=>changeLanguage(f.code)}><span className="wide-flag" aria-hidden="true">{f.flag}</span><b>{f.label}</b></button>)}</div>
   </section>
  </div>
  <div className="wide-panels">
   <section className="wide-left wide-panel" aria-label={t.guide}>
    <div className="wide-panel-heading">{left==='home'?<><div><small>QUICK GUIDE</small><h2>{t.guide}</h2></div><span className="wide-count">9 MENUS</span></>:<><button className="wide-back" onClick={()=>openMenu('home')}><span>←</span> {t.back}</button><strong>{leftTitle}</strong></>}</div>
    <div className="wide-left-body" key={session+'-'+left+'-'+station.stationCode}>
     {left==='home'&&<nav className="wide-menu-grid" aria-label={t.guide}>{menuItems.map((m,i)=><button key={m.id} onClick={()=>openMenu(m.id)}><span className={'wide-menu-icon v2-icon-'+m.id}><Icon name={m.icon} size={29}/></span><strong>{source.menu[i]}</strong><span className="wide-menu-arrow">↗</span></button>)}</nav>}
     {left==='live'&&<PositionArrivalDetails stationContext={station} state={arrivals} lang={lang} t={source}/>}
     {left==='route'&&<UnifiedRouteLab embedded stationContext={station} language={lang} active routeRequest={routeRequest}/>}
     {left==='gate'&&<GuideExperience embedded initialAction="gate" language={lang} active routeStation={station} showPrivacyNotice/>}
     {left==='fares'&&<GuideExperience embedded initialAction="fares" language={lang} active routeStation={station} showPrivacyNotice/>}
     {left==='tour'&&<NearbyTour station={station} lang={lang} active/>}
     {left==='found'&&foundStation&&<CompactLostFound embedded station={foundStation} lang={lang} active/>}
     {left==='lost'&&<TrainLostFinder lang={lang} active defaultStation={station.names.ko} defaultLine={station.line} defaultNames={station.names}/>}
     {left==='timetable'&&<TrainTimetable lang={lang} active stationContext={station}/>}
     {left==='facility'&&<FacilityDemo embedded stationContext={station} lang={lang} active/>}
     {left==='feedback'&&<StationFeedback station={feedbackStation} lang={lang} active/>}
    </div>
   </section>
   <section className="wide-right wide-panel" aria-label={t.chat}>
    <div className="wide-panel-heading wide-chat-heading"><div><small>AI ASSISTANT</small><h2>{t.chat}</h2></div><span className="wide-ai-indicator"><i/>{busy?source.waiting:'GEMINI AI'}</span></div>
    <div className="wide-chat-body"><GuideExperience key={'chat-'+session+'-'+station.stationCode} embedded language={lang} active chatStation={station} routeStation={station} onRecommendMenu={openMenu} onBusyChange={setBusy} chatRequest={chatRequest} showPrivacyNotice={false}/></div>
    <div className="wide-composer">
     <div className="wide-composer-title"><strong>{t.help}</strong><span>{listening?t.listening:speechError||t.preview}</span></div>
     <form onSubmit={e=>{e.preventDefault();sendQuestion(draft);}} className="wide-composer-form">
      <textarea rows={2} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.placeholder} aria-label={t.typing} disabled={busy} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendQuestion(draft);}}}/>
      <div className="wide-composer-actions">
       <button type="button" className={'wide-microphone '+(listening?'recording':'')} onClick={startVoice} disabled={!speechSupported||busy} title={speechSupported?t.speech:t.speechUnsupported} aria-label={listening?t.stop:t.speech}>{MIC}<span>{listening?t.stop:t.speech}</span></button>
       <button type="submit" className="wide-send" disabled={!draft.trim()||busy}><Icon name="arrow" size={19}/><span>{t.ask}</span></button>
      </div>
     </form>
     <p className="wide-privacy">{t.privacy}</p>
    </div>
   </section>
  </div>
  {idleRemaining<=15&&idleRemaining>0&&!busy&&!listening&&<div className="wide-idle-backdrop" role="alertdialog" aria-modal="true" aria-label={t.idle}><div className="wide-idle-card"><div className="wide-idle-count">{idleRemaining}</div><h2>{t.idle}</h2><p>{t.idleDesc}</p><button onClick={()=>{activity.current=Date.now();setIdleRemaining(120);}}>{t.continue}</button></div></div>}
  {searchOpen&&<div className="wide-station-overlay" role="presentation" onClick={()=>setSearchOpen(false)}><section className="wide-station-dialog" role="dialog" aria-modal="true" aria-label={t.choose} onClick={e=>e.stopPropagation()}><div className="wide-station-dialog-header"><h2>{t.choose}</h2><button onClick={()=>setSearchOpen(false)} aria-label={t.close}>×</button></div><input autoFocus value={stationQuery} onChange={e=>setStationQuery(e.target.value)} placeholder={t.search} aria-label={t.search}/><div className="wide-station-list">{results.map(s=><button key={s.stationCode} onClick={()=>chooseStation(s.stationCode)}><b className="wide-line-pill" style={{background:s.color}}>{s.line}</b><strong>{s.names[lang]||s.names.ko}</strong><small>{s.stationCode}</small></button>)}{results.length===0&&<p>{t.searchEmpty}</p>}</div></section></div>}
 </main>;
}

export default function WideEntry(){
 const [entry,setEntry]=useState(null);
 useEffect(()=>{
  const sync=()=>setEntry(readStationEntry(window.location.href,'ko'));
  sync();window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);
 },[]);
 if(!entry)return <main className="wide-loading">Wide View</main>;
 if(!entry.station)return <main className="wide-loading">{labels[entry.language]?.noStation||labels.ko.noStation}</main>;
 const updateLanguage=language=>setEntry(prev=>({...prev,language}));
 const updateStation=stationCode=>setEntry(prev=>({...prev,code:stationCode,station:getStationByCode(stationCode)}));
 return <WideGuide station={entry.station} lang={entry.language} setLang={updateLanguage} setStationCode={updateStation}/>;
}
