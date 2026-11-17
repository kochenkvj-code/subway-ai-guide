'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import QRCode from 'qrcode';
import {startInterpreterSync} from '../lib/interpreter-sync';
import {connectInterpreter} from '../lib/interpreter-realtime-client';
import {getStationByCode} from '../lib/station-master';
import './interpreter.css';

const API='/api/interpreter-test';
const SESSION_KEY='metro-interpreter-test-v1';
const LANGS=[
 {id:'ko',name:'한국어',icon:'🇰🇷',locale:'ko-KR'},
 {id:'en',name:'English',icon:'🇺🇸',locale:'en-US'},
 {id:'ja',name:'日本語',icon:'🇯🇵',locale:'ja-JP'},
 {id:'zh',name:'中文',icon:'🇨🇳',locale:'zh-CN'}
];
const copy={
 ko:{staff:'직원',guest:'승객',title:'실시간 통역',tagline:'언어가 달라도, 같은 자리에서 바로 대화하세요.',start:'통역 시작',station:'기준역 코드',staffLang:'직원 언어',roomCreated:'통역방이 생성됐어요',scan:'승객에게 QR코드를 보여주세요',scanHint:'앱 설치나 회원가입 없이 브라우저로 연결됩니다.',showQR:'입장 QR 보기',hideQR:'대화 화면 보기',waiting:'승객이 QR코드를 스캔하기를 기다리고 있어요',joined:'승객이 입장했습니다',language:'내 언어',newMessage:'메시지를 입력하세요',send:'번역 전송',voice:'말하기',stopVoice:'음성 입력 중지',working:'AI가 번역하고 있어요…',ended:'대화가 종료되었습니다',close:'대화 종료',confirmClose:'양쪽의 통역방을 종료하고 대화 내용을 삭제할까요?',back:'처음으로',seeOther:'원문 보기',hideOther:'접기',listen:'듣기',connected:'실시간 연결 중',offline:'연결 확인 중',time:'30분 자동 종료',share:'입장 링크 복사',copied:'복사했어요',joinTitle:'직원과 대화하기',joinSubtitle:'언어를 선택하면 직원과 대화할 수 있습니다.',chooseLang:'내가 사용할 언어',join:'대화 시작',joinNotice:'회원가입·앱 설치가 필요하지 않습니다.',qrTitle:'Scan to talk with station staff',guestLabel:'승객',staffLabel:'직원',check:'음성으로 말한 내용을 확인한 뒤 전송하세요.',original:'원문',translated:'번역문',waitingHint:'상대방이 입장하면 대화를 시작할 수 있습니다.',retry:'다시 시도',error:'연결에 문제가 발생했습니다.'},
 en:{staff:'Staff',guest:'Passenger',title:'Live interpreter',tagline:'Communicate with station staff in your own language.',start:'Start interpreting',station:'Station code',staffLang:'Staff language',roomCreated:'Room is ready',scan:'Show this QR code to the passenger',scanHint:'No app or registration required.',showQR:'Show entry QR',hideQR:'Go to chat',waiting:'Waiting for the passenger to scan the QR code',joined:'The passenger has joined',language:'My language',newMessage:'Type a message…',send:'Translate & send',voice:'Speak',stopVoice:'Stop listening',working:'Translating…',ended:'Chat ended',close:'End chat',confirmClose:'End this conversation for both people and erase its messages?',back:'New room',seeOther:'View original',hideOther:'Hide',listen:'Listen',connected:'Connected',offline:'Checking connection',time:'30 min limit',share:'Copy invite link',copied:'Copied',joinTitle:'Talk with station staff',joinSubtitle:'Choose your language to start chatting.',chooseLang:'Your language',join:'Start chat',joinNotice:'No app download or sign-up required.',qrTitle:'Scan to talk with station staff',guestLabel:'Passenger',staffLabel:'Station staff',check:'Review recognized speech before sending.',original:'Original',translated:'Translation',waitingHint:'You can start once the other person joins.',retry:'Try again',error:'Unable to connect.'},
 ja:{staff:'駅員',guest:'乗客',title:'リアルタイム通訳',tagline:'駅員とあなたの言語で会話できます。',start:'通訳を開始',station:'駅コード',staffLang:'駅員の言語',roomCreated:'チャットを作成しました',scan:'このQRコードを乗客に見せてください',scanHint:'アプリのインストール・登録は不要です。',showQR:'QRコードを表示',hideQR:'チャットへ',waiting:'乗客の入室を待っています',joined:'乗客が入室しました',language:'使用言語',newMessage:'メッセージを入力…',send:'翻訳して送信',voice:'話す',stopVoice:'音声入力を終了',working:'翻訳中…',ended:'会話が終了しました',close:'会話終了',confirmClose:'双方のチャットを終了し会話を削除しますか？',back:'新しいルーム',seeOther:'原文を見る',hideOther:'閉じる',listen:'読み上げ',connected:'接続中',offline:'接続を確認中',time:'30分で終了',share:'招待リンクをコピー',copied:'コピーしました',joinTitle:'駅員と話す',joinSubtitle:'言語を選んで駅員と会話できます。',chooseLang:'使用する言語',join:'会話を開始',joinNotice:'アプリや会員登録は不要です。',qrTitle:'Scan to talk with station staff',guestLabel:'乗客',staffLabel:'駅員',check:'音声認識の内容を確認して送信してください。',original:'原文',translated:'翻訳',waitingHint:'相手が入室すると会話できます。',retry:'再試行',error:'接続できませんでした。'},
 zh:{staff:'工作人员',guest:'乘客',title:'实时口译',tagline:'用自己的语言与地铁工作人员交流。',start:'开始口译',station:'车站代码',staffLang:'工作人员语言',roomCreated:'聊天室已创建',scan:'请向乘客展示二维码',scanHint:'无需安装应用或注册。',showQR:'查看入场二维码',hideQR:'进入聊天',waiting:'正在等待乘客扫码',joined:'乘客已加入',language:'我的语言',newMessage:'输入消息…',send:'翻译并发送',voice:'说话',stopVoice:'停止语音输入',working:'正在翻译…',ended:'对话已结束',close:'结束对话',confirmClose:'确定结束双方聊天并删除消息吗？',back:'新建房间',seeOther:'查看原文',hideOther:'收起',listen:'朗读',connected:'已连接',offline:'检查连接中',time:'30分钟后结束',share:'复制邀请链接',copied:'已复制',joinTitle:'与工作人员交谈',joinSubtitle:'选择语言即可与工作人员交流。',chooseLang:'您的语言',join:'开始对话',joinNotice:'无需安装应用或注册账号。',qrTitle:'Scan to talk with station staff',guestLabel:'乘客',staffLabel:'车站工作人员',check:'请确认语音识别内容后发送。',original:'原文',translated:'译文',waitingHint:'对方进入后即可开始聊天。',retry:'重试',error:'连接失败。'}
};
const screenCopy={
 ko:{station:'기준역',startHint:'외국인 승객과 각자의 언어로 대화하세요.',qrHint:'통역을 시작하면 승객 입장 QR이 표시됩니다.',staffPin:'직원 확인 · 기준역 번호 4자리',creating:'통역방 생성 중…',joining:'연결 중…',privacy:'민감한 개인정보는 입력하지 마세요.',staffJoined:'직원과 연결되었습니다',home:'메인 화면으로 돌아가기',newRoom:'새 통역 시작',endHint:'이용해 주셔서 감사합니다.',redirect:'잠시 후 지하철 AI 안내로 이동합니다.',chooseStation:'기준역 번호',guestLanguage:'승객은 입장 후 언어를 선택합니다.',showTranslation:'번역 보기',ready:'대화를 시작해 보세요.',returnHome:'홈으로',roomUnavailable:'유효하지 않거나 종료된 통역방입니다.'},
 en:{station:'Station',startHint:'Talk with passengers in your own language.',qrHint:'An entry QR code appears when you start.',staffPin:'Staff access · 4-digit station code',creating:'Opening room…',joining:'Connecting…',privacy:'Do not share sensitive personal information.',staffJoined:'Connected to station staff',home:'Back to subway guide',newRoom:'Start a new chat',endHint:'Thank you for using the interpreter.',redirect:'Returning to the subway guide shortly.',chooseStation:'Station code',guestLanguage:'Passengers choose their language when joining.',showTranslation:'View translation',ready:'Start a conversation.',returnHome:'Home',roomUnavailable:'This room is no longer available.'},
 ja:{station:'基準駅',startHint:'乗客とそれぞれの言語で会話できます。',qrHint:'通訳を開始すると入室用QRコードが表示されます。',staffPin:'駅員確認・4桁の駅コード',creating:'作成中…',joining:'接続中…',privacy:'個人情報の入力はお控えください。',staffJoined:'駅員と接続しました',home:'地下鉄案内に戻る',newRoom:'新しい通訳を開始',endHint:'ご利用ありがとうございました。',redirect:'まもなく地下鉄案内に移動します。',chooseStation:'駅コード',guestLanguage:'乗客は入室時に言語を選択します。',showTranslation:'翻訳を見る',ready:'会話を始めましょう。',returnHome:'ホーム',roomUnavailable:'この会話は終了しているか無効です。'},
 zh:{station:'当前车站',startHint:'使用各自的语言与乘客交流。',qrHint:'开始口译后将显示入场二维码。',staffPin:'工作人员确认 · 四位车站代码',creating:'正在创建…',joining:'正在连接…',privacy:'请勿输入敏感个人信息。',staffJoined:'已连接工作人员',home:'返回地铁指南',newRoom:'开始新对话',endHint:'感谢您的使用。',redirect:'即将返回地铁指南。',chooseStation:'车站代码',guestLanguage:'乘客加入后选择语言。',showTranslation:'查看译文',ready:'开始交流吧。',returnHome:'首页',roomUnavailable:'此聊天室已结束或无效。'}
};
const validLang=value=>LANGS.some(x=>x.id===value);
const roomContext=(r,fallback={})=>({role:r?.role||fallback.role||'staff',stationCode:r?.stationCode||fallback.stationCode||'',lang:(r?.role==='guest'?r?.guestLang:r?.staffLang)||fallback.lang||'en'});
function homeUrl(context){const params=new URLSearchParams();if(getStationByCode(context?.stationCode))params.set('station',context.stationCode);params.set('lang',validLang(context?.lang)?context.lang:'en');return '/?'+params.toString();}
function StationLabel({code,lang}){const station=getStationByCode(code);return station?<span className="it-station-label"><span className="it-line" style={{background:station.color}}>{station.line}</span><strong>{station.names[lang]||station.names.ko}</strong></span>:null;}
function SmallIcon({name}){const paths={back:'M15 5l-7 7 7 7',mic:'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-6 9a6 6 0 0 0 12 0m-6 6v3m-3 0h6',send:'m3 3 18 9-18 9 4-9-4-9Zm4 9h14',qr:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM13 13h3v3h-3m8-3v3m-8 5h4m3-2v2h1',check:'m4 12 5 5L20 6',volume:'M3 9h4l5-4v14l-5-4H3zM16 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12',home:'m3 10 9-7 9 7v10h-6v-6H9v6H3z'};return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;}

const errText={
 'room-limit':'통역방 생성 제한에 도달했습니다. 30분 후 다시 시도해 주세요.',
 'room-not-found':'통역방을 찾을 수 없거나 종료됐습니다.',
 'room-ended':'통역방이 종료되었거나 이용 시간이 만료됐습니다.',
 'invite-used':'QR코드가 이미 사용됐거나 유효하지 않습니다.',
 'invalid-invite':'유효하지 않은 초대 링크입니다.',
 'invalid-access':'통역방 접근 권한이 없습니다.',
 'invalid-station':'실제 운영 역의 4자리 역번호를 입력해 주세요.',
 'message-length':'메시지는 1~400자로 입력해 주세요.',
 'waiting-for-guest':'승객이 입장한 다음 메시지를 전송해 주세요.',
 'message-limit':'이 통역방의 메시지 한도에 도달했습니다.',
 'translation-unavailable':'AI 번역 서버 연결에 실패했습니다. 잠시 후 재시도해 주세요.',
 'temporarily-unavailable':'서버 연결에 실패했습니다. 다시 시도해 주세요.'
};
const getBrowserLang=()=>{
 if(typeof navigator==='undefined')return 'en';
 const id=String(navigator.language||'en').toLowerCase().split('-')[0];
 return LANGS.some(x=>x.id===id)?id:id==='zh'?'zh':'en';
};
const locale=id=>LANGS.find(x=>x.id===id)?.locale||'en-US';
async function api(action,body={},token=''){
 const response=await fetch(API,{method:'POST',cache:'no-store',
  headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
  body:JSON.stringify({action,...body})});
 const result=await response.json().catch(()=>({ok:false,error:'temporarily-unavailable'}));
 if(!response.ok||!result.ok)throw new Error(result.error||'temporarily-unavailable');
 return result;
}

export default function InterpreterTestPage(){
 const [access,setAccess]=useState(null);
 const [endedContext,setEndedContext]=useState(null);
 const [isReady,setIsReady]=useState(false);
 const [inviteStation,setInviteStation]=useState('');
 const contextRef=useRef({role:'staff',stationCode:'0154',lang:'ko'});
 const pageRef=useRef(null);
 const [stationPin,setStationPin]=useState('');
 const pendingSend=useRef(null);
 const [mode,setMode]=useState('idle');
 const [stationCode,setStationCode]=useState('0154');
 const [entryLang,setEntryLang]=useState('ko');
 const [room,setRoom]=useState(null);
 const [token,setToken]=useState('');
 const [invite,setInvite]=useState('');
 const [pendingInvite,setPendingInvite]=useState(null);
 const [messages,setMessages]=useState([]);
 const [draft,setDraft]=useState('');
 const [qrData,setQrData]=useState('');
 const [showQr,setShowQr]=useState(false);
 const [busy,setBusy]=useState(false);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [connected,setConnected]=useState(false);
 const [listening,setListening]=useState(false);
 const [voiceDraft,setVoiceDraft]=useState(false);
 const [expanded,setExpanded]=useState({});
 const [copied,setCopied]=useState(false);
 const scrollRef=useRef(null);
 const voiceRef=useRef(null);
 const roomRef=useRef(null);
 const inviteLink=useMemo(()=>{
  if(typeof window==='undefined'||!room?.id||!invite)return '';
  return window.location.origin+'/interpreter-test?room='+encodeURIComponent(room.id)+(getStationByCode(room.stationCode)?'&station='+encodeURIComponent(room.stationCode):'')+'#invite='+encodeURIComponent(invite);
 },[room?.id,room?.stationCode,invite]);
 const role=room?.role||'staff';
 const currentLang=(mode==='ended'?endedContext?.lang:room?(role==='staff'?room.staffLang:room.guestLang):entryLang)||entryLang;
 const t={...copy[currentLang],...screenCopy[currentLang]};
 const home=homeUrl(mode==='ended'?endedContext:mode==='room'?roomContext(room,contextRef.current):{stationCode:mode==='join'?inviteStation:stationCode,lang:entryLang});
 const label=id=>LANGS.find(x=>x.id===id)?.name||id;
 const sayError=e=>setError(({'staff-required':'관리자 로그인 또는 기준역 번호 확인이 필요합니다.','message-pending':'이 메시지를 처리하고 있습니다. 잠시 후 같은 내용으로 다시 전송해 주세요.','request-conflict':'전송 내용을 확인하고 다시 시도해 주세요.'})[e?.message]||errText[e?.message]||e?.message||copy.ko.error);
 const saveSession=(r,nextToken,nextInvite='')=>{
  const context=roomContext(r,contextRef.current);contextRef.current=context;
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({room:r.id,token:nextToken,invite:nextInvite,...context}));}catch{}
 };
 const clearSession=()=>{
  roomRef.current=null;
  try{sessionStorage.removeItem(SESSION_KEY);}catch{}
  voiceRef.current?.abort?.();voiceRef.current=null;setListening(false);
  pendingSend.current=null;setVoiceDraft(false);setExpanded({});setCopied(false);setQrData('');
  setMode('idle');setRoom(null);setToken('');setInvite('');setPendingInvite(null);setMessages([]);setDraft('');setShowQr(false);setConnected(false);
 };
 const finishRoom=()=>{
  const context={...contextRef.current};
  clearSession();setEndedContext(context);setEntryLang(context.lang);setError('');setMode('ended');
  // Store only non-sensitive exit context so reloading cannot turn a guest into a room creator.
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({ended:true,...context}));}catch{}
 };
 const newRoom=()=>{
  if(endedContext?.role!=='staff'||!access?.interpreter)return;
  clearSession();setStationCode(getStationByCode(endedContext.stationCode)?endedContext.stationCode:stationCode);setEntryLang(endedContext.lang);setEndedContext(null);setError('');
 };
 useEffect(()=>{
  const search=new URLSearchParams(window.location.search);
  const id=search.get('room');
  const code=getStationByCode(search.get('station'))?search.get('station'):'';
  const browserLang=getBrowserLang();
  const lang=validLang(search.get('lang'))?search.get('lang'):browserLang;
  if(code)setStationCode(code);
  setEntryLang(lang);contextRef.current={role:'staff',stationCode:code||'0154',lang};
  fetch('/api/stats/auth',{cache:'no-store'}).catch(()=>{}).then(()=>fetch('/api/interpreter-access',{cache:'no-store'})).then(r=>r.json()).then(setAccess).catch(()=>setAccess({interpreter:false,mode:'admin'}));
  const invitation=new URLSearchParams(window.location.hash.slice(1)).get('invite')||search.get('invite');
  let restored=null;
  try{restored=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch{}
  if(invitation&&id){
   const pending={room:id,invite:invitation};
   contextRef.current={role:'guest',stationCode:code,lang:browserLang};
   setEntryLang(browserLang);setInviteStation(code);setPendingInvite(pending);setMode('join');
   try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({pending,...contextRef.current}));}catch{}
   window.history.replaceState(null,'','/interpreter-test');
  }else if(!code&&restored?.pending?.room&&restored?.pending?.invite){
   const context={role:'guest',stationCode:restored.stationCode||'',lang:validLang(restored.lang)?restored.lang:browserLang};
   contextRef.current=context;setEntryLang(context.lang);setInviteStation(context.stationCode);setPendingInvite(restored.pending);setMode('join');
  }else if(restored?.room&&restored?.token){
   const context={role:restored.role||(restored.invite?'staff':'guest'),stationCode:restored.stationCode||code,lang:validLang(restored.lang)?restored.lang:lang};
   contextRef.current=context;
   if(getStationByCode(context.stationCode))setStationCode(context.stationCode);
   setToken(restored.token);setInvite(restored.invite||'');roomRef.current=restored.room;
   setRoom({id:restored.room,role:context.role,stationCode:context.stationCode,staffLang:context.role==='staff'?context.lang:'ko',guestLang:context.role==='guest'?context.lang:browserLang});
   setShowQr(context.role==='staff'&&Boolean(restored.invite));setMode('room');
  }else if(!code&&restored?.ended){
   const context={role:restored.role==='guest'?'guest':'staff',stationCode:restored.stationCode||'',lang:validLang(restored.lang)?restored.lang:lang};
   contextRef.current=context;setEndedContext(context);setMode('ended');
  }
  setIsReady(true);
 },[]);
 useEffect(()=>{
  if(mode!=='ended'||endedContext?.role!=='guest')return;
  const timeout=setTimeout(()=>window.location.replace(homeUrl(endedContext)),5000);
  return()=>clearTimeout(timeout);
 },[mode,endedContext]);
 useEffect(()=>{
  if(mode!=='room')return;
  const viewport=window.visualViewport;
  const resize=()=>pageRef.current?.style.setProperty('--it-viewport',Math.round(viewport?.height||window.innerHeight)+'px');
  resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);
  return()=>{viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);pageRef.current?.style.removeProperty('--it-viewport');};
 },[mode]);
 useEffect(()=>{
  if(mode==='room'&&room?.role==='staff'&&room.guestJoined)setShowQr(false);
 },[mode,room?.role,room?.guestJoined]);
 useEffect(()=>{
  if(!inviteLink||!showQr)return;
  let active=true;
  QRCode.toDataURL(inviteLink,{width:264,margin:2,errorCorrectionLevel:'M',color:{dark:'#152f3f',light:'#ffffff'}}).then(data=>{
   if(active)setQrData(data);
  }).catch(()=>{if(active)setQrData('');});
  return()=>{active=false;};
 },[inviteLink,showQr]);
 const refresh=useCallback(async(id,access)=>{
  const response=await fetch(API+'?room='+encodeURIComponent(id),{
   cache:'no-store',headers:{Authorization:'Bearer '+access}
  });
  const result=await response.json().catch(()=>({ok:false,error:'temporarily-unavailable'}));
  if(!response.ok||!result.ok)throw new Error(result.error||'temporarily-unavailable');
  if(roomRef.current!==id)return result;
  contextRef.current=roomContext(result.room,contextRef.current);
  // Refresh the saved language/station without retaining a room after its end.
  try{const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');if(saved?.room===id)sessionStorage.setItem(SESSION_KEY,JSON.stringify({...saved,...contextRef.current}));}catch{}
  setRoom(result.room);setMessages(result.messages||[]);setConnected(true);
  return result;
 },[]);
 useEffect(()=>{
  if(mode!=='room'||!room?.id||!token)return;
  const controller=startInterpreterSync({
   load:()=>refresh(room.id,token),
   connect:callbacks=>connectInterpreter({room:room.id,token,...callbacks}),
   isVisible:()=>document.visibilityState!=='hidden',expiresAt:room.expiresAt,
   onStatus:setConnected,onError:e=>{
    setConnected(false);
    if(['room-not-found','room-ended','invalid-access'].includes(e.message)){
     if(roomRef.current===room.id)finishRoom();
    }
   }
  });
  const onVisible=()=>{if(document.visibilityState==='visible')controller.resume();};
  document.addEventListener('visibilitychange',onVisible);
  window.addEventListener('online',onVisible);
  return()=>{controller.stop();document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onVisible);};
 },[mode,room?.id,room?.expiresAt,token,refresh]);
 useEffect(()=>{
  const el=scrollRef.current;
  if(el&&messages.length)el.scrollTop=el.scrollHeight;
 },[messages.length]);
 async function create(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const result=await api('create',{stationCode,lang:entryLang,stationPin});
   roomRef.current=result.room.id;setRoom(result.room);setToken(result.token);
   setInvite(result.invite);setShowQr(true);setMode('room');setMessages([]);
   saveSession(result.room,result.token,result.invite);
  }catch(e){sayError(e);}finally{setBusy(false);}
 }
 async function join(){
  if(busy||!pendingInvite)return;
  contextRef.current={role:'guest',stationCode:inviteStation,lang:entryLang};
  setBusy(true);setError('');
  try{
   const result=await api('join',{room:pendingInvite.room,invite:pendingInvite.invite,lang:entryLang});
   roomRef.current=result.room.id;setRoom(result.room);setToken(result.token);
   setPendingInvite(null);setShowQr(false);setMode('room');setMessages([]);
   saveSession(result.room,result.token);
  }catch(e){if(['room-not-found','room-ended'].includes(e.message))finishRoom();else sayError(e);}finally{setBusy(false);}
 }
 async function changeLanguage(newLang){
  if(!room){setEntryLang(newLang);return;}
  if(busy||!token)return;
  setBusy(true);setError('');
  try{
   const result=await api('language',{room:room.id,lang:newLang},token);
   if(roomRef.current===room.id){setRoom(result.room);contextRef.current=roomContext(result.room,contextRef.current);saveSession(result.room,token,invite);}
  }catch(e){sayError(e);}finally{setBusy(false);}
 }
 async function send(e){
  e?.preventDefault?.();
  const text=draft.trim();
  if(sending||!text||!room?.guestJoined||!token)return;
  setSending(true);setError('');
  try{
   if(!pendingSend.current||pendingSend.current.text!==text||pendingSend.current.room!==room.id)pendingSend.current={room:room.id,text,requestId:crypto.randomUUID()};
   await api('send',pendingSend.current,token);
   pendingSend.current=null;
   setDraft('');setVoiceDraft(false);await refresh(room.id,token);
  }catch(e){sayError(e);}finally{setSending(false);}
 }
 async function closeRoom(){
  if(!room||!token||busy)return;
  if(!window.confirm(t.confirmClose))return;
  setBusy(true);
  try{await api('close',{room:room.id},token);if(roomRef.current===room.id)finishRoom();}
  catch(e){sayError(e);}finally{setBusy(false);}
 }
 async function copyLink(){
  if(!inviteLink)return;
  try{await navigator.clipboard.writeText(inviteLink);setCopied(true);}
  catch{setError('링크 복사에 실패했습니다. QR코드를 사용해 주세요.');}
 }
 function voiceInput(){
  if(voiceRef.current){voiceRef.current.stop();voiceRef.current=null;setListening(false);return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){setError('이 브라우저는 음성인식을 지원하지 않습니다. 문자 입력을 이용해 주세요.');return;}
  const recognizer=new SR();
  recognizer.lang=locale(currentLang);recognizer.interimResults=false;
  recognizer.continuous=false;recognizer.maxAlternatives=1;
  recognizer.onresult=event=>{
   const sentence=Array.from(event.results||[]).map(x=>x[0]?.transcript||'').join(' ').trim();
   if(sentence){setVoiceDraft(true);setDraft(v=>v.trim()?v.trim()+' '+sentence:sentence);}
  };
  recognizer.onerror=event=>{if(event.error!=='aborted')setError('음성인식 오류 ['+event.error+'] · 직접 입력도 가능합니다.');setListening(false);voiceRef.current=null;};
  recognizer.onend=()=>{setListening(false);voiceRef.current=null;};
  try{recognizer.start();voiceRef.current=recognizer;setListening(true);setError('');}
  catch{setError('마이크를 시작할 수 없습니다.');setListening(false);}
 }
 function speak(text){
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  const speech=new SpeechSynthesisUtterance(text);
  speech.lang=locale(currentLang);speech.rate=.95;
  window.speechSynthesis.speak(speech);
 }
 function changeEntryLanguage(value){
  setEntryLang(value);
  if(mode==='join'&&pendingInvite){contextRef.current={role:'guest',stationCode:inviteStation,lang:value};try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({pending:pendingInvite,...contextRef.current}));}catch{}}
 }
 function renderLanguageSelect(value,onChange){
  return <select aria-label={t.language} value={value} onChange={e=>onChange(e.target.value)} disabled={busy}>
    {LANGS.map(x=><option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
  </select>;
 }
 return <main ref={pageRef} className={'it-page'+(mode==='room'?' it-room-page':'')} lang={currentLang==='zh'?'zh-CN':currentLang}>
  {mode!=='room'&&<header className="it-header"><a className="it-back" href={home} aria-label={t.returnHome}><SmallIcon name="back"/></a><h1>{mode==='join'?t.joinTitle:t.title}</h1></header>}
  {mode==='idle'&&(!isReady||!access?.interpreter)&&<section className="it-card it-access"><p role="status">{access?'관리자 로그인 후 이용할 수 있습니다.':'이용 권한 확인 중…'}</p><a className="it-secondary" href={home}>{t.home}</a></section>}
  {mode==='idle'&&isReady&&access?.interpreter&&<section className="it-card it-start">
   <p className="it-intro">{t.startHint}</p>
   <div className="it-form-row"><span>{t.station}</span>{getStationByCode(stationCode)?<StationLabel code={stationCode} lang={entryLang}/>:<input aria-label={t.chooseStation} className="it-station" inputMode="numeric" maxLength={4} value={stationCode} onChange={e=>setStationCode(e.target.value.replace(/\D/g,'').slice(0,4))}/>}</div>
   <label className="it-form-row"><span>{t.staffLang}</span>{renderLanguageSelect(entryLang,setEntryLang)}</label>
   <p className="it-fieldnote">{t.guestLanguage}</p>
   {access.mode==='station'&&!access.admin&&<label className="it-langlabel">{t.staffPin}<input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={stationPin} onChange={e=>setStationPin(e.target.value.replace(/\D/g,''))}/></label>}
   <button className="it-primary" onClick={create} disabled={busy||!getStationByCode(stationCode)||(access.mode==='station'&&!access.admin&&stationPin.length!==4)}>{busy?t.creating:t.start} <span aria-hidden="true">→</span></button>
   <div className="it-start-hint"><SmallIcon name="qr"/><p>{t.qrHint}</p></div>
   <p className="it-mutednote">{t.privacy}</p>
  </section>}
  {mode==='join'&&<section className="it-card it-join">
   <p className="it-intro">{t.joinSubtitle}</p>
   {getStationByCode(inviteStation)&&<div className="it-join-station"><StationLabel code={inviteStation} lang={entryLang}/></div>}
   <label className="it-form-row"><span>{t.chooseLang}</span>{renderLanguageSelect(entryLang,changeEntryLanguage)}</label>
   <button className="it-primary" disabled={busy} onClick={join}>{busy?t.joining:t.join} <span aria-hidden="true">→</span></button>
   <p className="it-mutednote">{t.joinNotice}</p>
   <p className="it-mutednote">{t.privacy}</p>
  </section>}
  {mode==='ended'&&<section className="it-card it-end">
   <div className="it-end-icon"><SmallIcon name="check"/></div>
   <h2>{t.ended}</h2><p>{t.endHint}</p>
   <a className="it-primary" href={home}><SmallIcon name="home"/> {t.home}</a>
   {endedContext?.role==='staff'&&access?.interpreter&&<button className="it-secondary" onClick={newRoom}>{t.newRoom}</button>}
   {endedContext?.role==='guest'&&<p className="it-mutednote">{t.redirect}</p>}
  </section>}
  {mode==='room'&&room&&<section className="it-chat">
   <header className="it-room-top">
    <div className="it-room-heading"><h1>{t.title}</h1><StationLabel code={room.stationCode} lang={currentLang}/></div>
    <button className="it-small it-end-button" onClick={closeRoom} disabled={busy}>{t.close}</button>
   </header>
   <div className="it-presence" aria-live="polite">
    <span className={'it-presence-dot'+(room.guestJoined&&connected?' ready':'')}/>
    <span>{!connected?t.offline:role==='guest'?t.staffJoined:room.guestJoined?t.joined:t.waiting}</span>
    <small>{t.time}</small>
   </div>
   <div className="it-room-toolbar">
    <label><span>{t.language}</span>{renderLanguageSelect(currentLang,changeLanguage)}</label>
    {role==='staff'&&!room.guestJoined&&!showQr&&<button className="it-small" onClick={()=>setShowQr(true)}><SmallIcon name="qr"/> {t.showQR}</button>}
   </div>
   {role==='staff'&&showQr&&!room.guestJoined&&<div className="it-qr-card">
    <h2 className="it-scan-en">{t.scan}</h2>
    <p className="it-scan-sub">Scan to talk with station staff</p>
    {qrData?<img className="it-qr" src={qrData} alt="QR code"/>:<div className="it-qr it-qr-placeholder">QR…</div>}
    <p className="it-noapp">No app installation · No sign-up</p>
    <p className="it-scan-jp">駅員と話す · 扫码与工作人员交谈</p>
    <div className="it-qr-actions">
     <button onClick={copyLink}>{copied?t.copied:t.share}</button>
     <button onClick={()=>setShowQr(false)}>{t.hideQR} →</button>
    </div>
   </div>}
   {(!showQr||room.guestJoined||role==='guest')&&<>
    <div className="it-messages" ref={scrollRef} aria-live="polite">
     {messages.length===0&&<div className="it-empty">
      <b>{room.guestJoined?t.ready:t.waitingHint}</b>
     </div>}
     {messages.map(m=>{
      const own=m.sender===role;
      const rendered=own?m.original:m.translated;
      const counterpart=own?m.translated:m.original;
      return <div className={'it-message '+(own?'it-mine':'it-theirs')} key={m.id}>
       <span className="it-msg-who">{own?(role==='staff'?t.staff:t.guest):(role==='staff'?t.guest:t.staff)} · {label(own?m.sourceLang:m.targetLang)}</span>
       <div className="it-bubble">{rendered}</div>
       <div className="it-msg-tools">
        <button onClick={()=>setExpanded(prev=>({...prev,[m.id]:!prev[m.id]}))}>{expanded[m.id]?t.hideOther:own?t.showTranslation:t.seeOther}</button>
        {!own&&<button onClick={()=>speak(rendered)}><SmallIcon name="volume"/> {t.listen}</button>}
       </div>
       {expanded[m.id]&&<div className="it-extra"><span>{own?t.translated:t.original}</span>{counterpart}</div>}
      </div>;
     })}
     {sending&&<div className="it-sending"><span className="it-spinner"/>{t.working}</div>}
    </div>
    <form className="it-composer" onSubmit={send}>
     <textarea value={draft} onChange={e=>setDraft(e.target.value.slice(0,400))} rows={2} maxLength={400}
      disabled={!room.guestJoined||sending} placeholder={room.guestJoined?t.newMessage:t.waiting} aria-label={t.newMessage}/>
     <div className="it-composer-buttons">
      <button type="button" onClick={voiceInput} disabled={!room.guestJoined||sending} className={'it-voice'+(listening?' listening':'')}>{listening?'■ '+t.stopVoice:<><SmallIcon name="mic"/> {t.voice}</>}</button>
      <button type="submit" disabled={!draft.trim()||!room.guestJoined||sending} className="it-submit">{sending?'…':<><SmallIcon name="send"/> {t.send}</>}</button>
     </div>
     {(listening||(voiceDraft&&draft.trim()))&&<p>{t.check}</p>}
    </form>
   </>}
  </section>}
  {error&&mode!=='ended'&&<div role="alert" className="it-error">{error}<button onClick={()=>setError('')} aria-label="Close">×</button></div>}
 </main>;
}
