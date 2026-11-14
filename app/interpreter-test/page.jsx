'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import QRCode from 'qrcode';
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
 ko:{staff:'직원',guest:'승객',title:'실시간 AI 통역 채팅',tagline:'언어가 달라도, 같은 자리에서 바로 대화하세요.',start:'직원용 통역방 만들기',station:'기준역 코드',staffLang:'직원 언어',roomCreated:'통역방이 생성됐어요',scan:'승객에게 QR코드를 보여주세요',scanHint:'앱 설치나 회원가입 없이 브라우저로 연결됩니다.',showQR:'입장 QR 보기',hideQR:'대화 화면 보기',waiting:'승객이 QR코드를 스캔하기를 기다리고 있어요',joined:'승객이 입장했습니다',language:'사용 언어',newMessage:'메시지를 입력하세요',send:'번역해서 전송',voice:'음성 입력',stopVoice:'음성 입력 중지',working:'AI가 번역하고 있어요…',ended:'통역방이 종료되었습니다',close:'통역방 종료',confirmClose:'양쪽의 통역방을 종료하고 대화 내용을 삭제할까요?',back:'처음으로',seeOther:'상대 언어 보기',hideOther:'번역 접기',listen:'읽어주기',connected:'실시간 연결 중',offline:'연결 확인 중',time:'30분 자동 만료',note:'이 페이지는 테스트 서비스입니다. 직원 인증은 아직 적용되지 않았습니다.',share:'입장 링크 복사',copied:'복사했어요',joinTitle:'역무원과 대화하기',joinSubtitle:'실시간 AI 번역으로 역무원과 직접 소통할 수 있어요.',chooseLang:'내가 사용할 언어',join:'설치 없이 통역 채팅 시작',joinNotice:'회원가입·앱 설치가 필요하지 않습니다.',qrTitle:'Scan to talk with station staff',guestLabel:'승객',staffLabel:'역무원',check:'음성으로 말한 내용을 확인한 뒤 전송하세요.',original:'원문',translated:'번역문',waitingHint:'상대방이 입장하면 대화를 시작할 수 있습니다.',limit:'한 방 최대 36개 메시지 · 30분',retry:'다시 시도',error:'연결에 문제가 발생했습니다.',explain:'지하철 안내를 위한 직원·승객 1:1 임시 통역방입니다.'},
 en:{staff:'Staff',guest:'Passenger',title:'Live AI Interpreter',tagline:'Communicate with station staff in your own language.',start:'Open a staff room',station:'Station code',staffLang:'Staff language',roomCreated:'Room is ready',scan:'Show this QR code to the passenger',scanHint:'No app or registration required.',showQR:'Show entry QR',hideQR:'Go to chat',waiting:'Waiting for the passenger to scan the QR code',joined:'The passenger has joined',language:'Your language',newMessage:'Type a message…',send:'Translate & send',voice:'Speak',stopVoice:'Stop listening',working:'Translating…',ended:'This chat has ended',close:'End chat',confirmClose:'End this conversation for both people and erase its messages?',back:'New room',seeOther:'Show other language',hideOther:'Hide original',listen:'Listen',connected:'Connected',offline:'Checking connection',time:'Expires after 30 min',note:'Pilot service; staff verification is not enabled yet.',share:'Copy invite link',copied:'Copied',joinTitle:'Talk with station staff',joinSubtitle:'Chat with staff through live AI translation.',chooseLang:'Your language',join:'Join translated chat',joinNotice:'No app download or sign-up required.',qrTitle:'Scan to talk with station staff',guestLabel:'Passenger',staffLabel:'Station staff',check:'Review recognized speech before sending.',original:'Original',translated:'Translation',waitingHint:'You can start once the other person joins.',limit:'Max. 36 messages · 30 min',retry:'Try again',error:'Unable to connect.',explain:'Private one-to-one translated chat for subway help.'},
 ja:{staff:'駅員',guest:'乗客',title:'リアルタイムAI通訳チャット',tagline:'駅員とあなたの言語で会話できます。',start:'駅員用ルームを作成',station:'駅コード',staffLang:'駅員の言語',roomCreated:'チャットを作成しました',scan:'このQRコードを乗客に見せてください',scanHint:'アプリのインストール・登録は不要です。',showQR:'QRコードを表示',hideQR:'チャットへ',waiting:'乗客の入室を待っています',joined:'乗客が入室しました',language:'使用言語',newMessage:'メッセージを入力…',send:'翻訳して送信',voice:'音声入力',stopVoice:'音声入力を終了',working:'翻訳中…',ended:'チャットは終了しました',close:'チャット終了',confirmClose:'双方のチャットを終了し会話を削除しますか？',back:'新しいルーム',seeOther:'原文を見る',hideOther:'閉じる',listen:'読み上げ',connected:'接続中',offline:'接続を確認中',time:'30分で自動終了',note:'テストサービスです。駅員認証はまだありません。',share:'招待リンクをコピー',copied:'コピーしました',joinTitle:'駅員と話す',joinSubtitle:'AI通訳で駅員と直接会話できます。',chooseLang:'使用する言語',join:'通訳チャットに入る',joinNotice:'アプリや会員登録は不要です。',qrTitle:'Scan to talk with station staff',guestLabel:'乗客',staffLabel:'駅員',check:'音声認識の内容を確認して送信してください。',original:'原文',translated:'翻訳',waitingHint:'相手が入室すると会話できます。',limit:'最大36件・30分',retry:'再試行',error:'接続できませんでした。',explain:'地下鉄の案内のための1対1の一時通訳チャットです。'},
 zh:{staff:'工作人员',guest:'乘客',title:'实时AI翻译聊天',tagline:'用自己的语言与地铁工作人员交流。',start:'创建工作人员聊天室',station:'车站代码',staffLang:'工作人员语言',roomCreated:'聊天室已创建',scan:'请向乘客展示二维码',scanHint:'无需安装应用或注册。',showQR:'查看入场二维码',hideQR:'进入聊天',waiting:'正在等待乘客扫码',joined:'乘客已加入',language:'使用语言',newMessage:'输入消息…',send:'翻译并发送',voice:'语音输入',stopVoice:'停止语音输入',working:'正在翻译…',ended:'聊天已结束',close:'结束聊天',confirmClose:'确定结束双方聊天并删除消息吗？',back:'新建房间',seeOther:'查看原文',hideOther:'收起原文',listen:'朗读',connected:'已连接',offline:'检查连接中',time:'30分钟后自动结束',note:'测试服务，尚未启用员工身份验证。',share:'复制邀请链接',copied:'已复制',joinTitle:'与车站工作人员交谈',joinSubtitle:'通过实时AI翻译与工作人员交流。',chooseLang:'您的语言',join:'进入翻译聊天',joinNotice:'无需安装应用或注册账号。',qrTitle:'Scan to talk with station staff',guestLabel:'乘客',staffLabel:'车站工作人员',check:'请确认语音识别内容后发送。',original:'原文',translated:'译文',waitingHint:'对方进入后即可开始聊天。',limit:'最多36条消息 · 30分钟',retry:'重试',error:'连接失败。',explain:'用于地铁咨询的一对一临时翻译聊天。'}
};
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
 const [expanded,setExpanded]=useState({});
 const [copied,setCopied]=useState(false);
 const scrollRef=useRef(null);
 const voiceRef=useRef(null);
 const roomRef=useRef(null);
 const inviteLink=useMemo(()=>{
  if(typeof window==='undefined'||!room?.id||!invite)return '';
  return window.location.origin+'/interpreter-test?room='+encodeURIComponent(room.id)+'#invite='+encodeURIComponent(invite);
 },[room?.id,invite]);
 const role=room?.role||'staff';
 const currentLang=room?(role==='staff'?room.staffLang:room.guestLang):entryLang;
 const t=copy[currentLang]||copy.ko;
 const language=LANGS.find(x=>x.id===currentLang)||LANGS[0];
 const label=id=>LANGS.find(x=>x.id===id)?.name||id;
 const sayError=e=>setError(errText[e?.message]||e?.message||copy.ko.error);
 const saveSession=(r,nextToken,nextInvite='')=>{
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({room:r.id,token:nextToken,invite:nextInvite}));}catch{}
 };
 const clearSession=()=>{
  try{sessionStorage.removeItem(SESSION_KEY);}catch{}
  voiceRef.current?.abort?.();voiceRef.current=null;setListening(false);
  setMode('idle');setRoom(null);setToken('');setInvite('');setPendingInvite(null);setMessages([]);setDraft('');setShowQr(false);setConnected(false);
 };
 useEffect(()=>{
  const lang=getBrowserLang();
  const search=new URLSearchParams(window.location.search);
  const id=search.get('room');
  const invitation=new URLSearchParams(window.location.hash.slice(1)).get('invite')||search.get('invite');
  if(invitation&&id){
   setEntryLang(lang);setPendingInvite({room:id,invite:invitation});setMode('join');
   window.history.replaceState(null,'','/interpreter-test');
   return;
  }
  let restored=null;
  try{restored=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch{}
  if(restored?.room&&restored?.token){
   setToken(restored.token);setInvite(restored.invite||'');roomRef.current=restored.room;
   setRoom({id:restored.room,role:restored.invite?'staff':'guest',staffLang:'ko',guestLang:lang});
   setShowQr(Boolean(restored.invite));setMode('room');
  }
 },[]);
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
  setRoom(result.room);setMessages(result.messages||[]);setConnected(true);
  return result;
 },[]);
 useEffect(()=>{
  if(mode!=='room'||!room?.id||!token)return;
  let stopped=false,waiting=false;
  const id=room.id;
  async function tick(){
   if(stopped||waiting||document.visibilityState==='hidden')return;
   waiting=true;
   try{
    await refresh(id,token);
    if(!stopped)setError('');
   }catch(e){
    if(stopped)return;
    setConnected(false);
    if(e.message==='room-not-found'||e.message==='room-ended'||e.message==='invalid-access'){
     clearSession();setMode('ended');setError(errText[e.message]);
    }
   }finally{waiting=false;}
  }
  tick();
  const timer=setInterval(tick,1800);
  const onVisible=()=>{if(document.visibilityState==='visible')tick();};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[mode,room?.id,token,refresh]);
 useEffect(()=>{
  const el=scrollRef.current;
  if(el&&messages.length)el.scrollTop=el.scrollHeight;
 },[messages.length]);
 async function create(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const result=await api('create',{stationCode,lang:entryLang});
   roomRef.current=result.room.id;setRoom(result.room);setToken(result.token);
   setInvite(result.invite);setShowQr(true);setMode('room');setMessages([]);
   saveSession(result.room,result.token,result.invite);
  }catch(e){sayError(e);}finally{setBusy(false);}
 }
 async function join(){
  if(busy||!pendingInvite)return;
  setBusy(true);setError('');
  try{
   const result=await api('join',{room:pendingInvite.room,invite:pendingInvite.invite,lang:entryLang});
   roomRef.current=result.room.id;setRoom(result.room);setToken(result.token);
   setPendingInvite(null);setShowQr(false);setMode('room');setMessages([]);
   saveSession(result.room,result.token);
  }catch(e){sayError(e);}finally{setBusy(false);}
 }
 async function changeLanguage(newLang){
  if(!room){setEntryLang(newLang);return;}
  if(busy||!token)return;
  setBusy(true);setError('');
  try{
   const result=await api('language',{room:room.id,lang:newLang},token);
   setRoom(result.room);
  }catch(e){sayError(e);}finally{setBusy(false);}
 }
 async function send(e){
  e?.preventDefault?.();
  const text=draft.trim();
  if(sending||!text||!room?.guestJoined||!token)return;
  setSending(true);setError('');
  try{
   await api('send',{room:room.id,text},token);
   setDraft('');await refresh(room.id,token);
  }catch(e){sayError(e);}finally{setSending(false);}
 }
 async function closeRoom(){
  if(!room||!token||busy)return;
  if(!window.confirm(t.confirmClose))return;
  setBusy(true);
  try{await api('close',{room:room.id},token);clearSession();setMode('ended');setError('');}
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
   if(sentence)setDraft(v=>v.trim()?v.trim()+' '+sentence:sentence);
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
 function renderLanguageSelect(value,onChange){
  return <select aria-label={t.language} value={value} onChange={e=>onChange(e.target.value)} disabled={busy}>
    {LANGS.map(x=><option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
  </select>;
 }
 return <main className="it-page">
  <header className="it-brand">
   <div className="it-logo">文</div>
   <div><span>SUBWAY AI GUIDE · MOBILE TEST</span><strong>METRO INTERPRETER</strong></div>
   <span className="it-testmark">PILOT</span>
  </header>
  {mode==='idle'&&<section className="it-card it-start">
   <div className="it-icon-hero">🌏</div>
   <span className="it-eyebrow">LIVE TRANSLATION</span>
   <h1>실시간 통역 채팅방</h1>
   <p className="it-intro">직원과 외국인 승객이 QR코드 하나로 연결돼, 각자의 언어로 대화할 수 있습니다.</p>
   <div className="it-steps"><span><b>01</b> 방 개설</span><span>→</span><span><b>02</b> QR 입장</span><span>→</span><span><b>03</b> 양방향 통역</span></div>
   <div className="it-form-row">
    <label>기준역 번호 <input className="it-station" inputMode="numeric" maxLength={4} value={stationCode} onChange={e=>setStationCode(e.target.value.replace(/\D/g,'').slice(0,4))} /></label>
    <label>직원 사용 언어 {renderLanguageSelect(entryLang,setEntryLang)}</label>
   </div>
   <button className="it-primary" onClick={create} disabled={busy||stationCode.length!==4}>{busy?'통역방 생성 중…':'통역방 만들기 →'}</button>
   <div className="it-footnote"><span>✓ 앱 설치 없음</span><span>✓ 1:1 비공개</span><span>✓ 30분 자동 종료</span></div>
   <p className="it-warning">테스트 기능 · 직원 인증은 아직 적용되지 않았습니다. 실제 민감한 개인정보는 입력하지 마세요.</p>
  </section>}
  {mode==='join'&&<section className="it-card it-join">
   <div className="it-join-icon">👋</div>
   <span className="it-eyebrow">LIVE TRANSLATED CHAT</span>
   <h1>{(copy[entryLang]||copy.en).joinTitle}</h1>
   <p className="it-intro">{(copy[entryLang]||copy.en).joinSubtitle}</p>
   <label className="it-langlabel">{(copy[entryLang]||copy.en).chooseLang}{renderLanguageSelect(entryLang,setEntryLang)}</label>
   <div className="it-join-benefits"><span>🌐 AI translation</span><span>🔒 One-to-one chat</span></div>
   <button className="it-primary" disabled={busy} onClick={join}>{busy?'Connecting…':(copy[entryLang]||copy.en).join+' →'}</button>
   <p className="it-mutednote">{(copy[entryLang]||copy.en).joinNotice}</p>
  </section>}
  {mode==='ended'&&<section className="it-card it-end">
   <div className="it-icon-hero">✓</div><h1>{copy.ko.ended}</h1><p>{error||'메시지가 종료되어 더 이상 공유되지 않습니다.'}</p>
   <button className="it-primary" onClick={()=>{setError('');setMode('idle');setEntryLang('ko');}}>새 테스트 시작</button>
  </section>}
  {mode==='room'&&room&&<section className="it-chat">
   <div className="it-room-top">
    <div><span className="it-eyebrow">{role==='staff'?'STAFF ROOM':'PASSENGER ROOM'} · {room.stationCode}</span>
     <h1>{t.title}</h1></div>
    <span className={'it-dot'+(connected?' active':'')} title={connected?t.connected:t.offline}/>
   </div>
   <div className="it-room-toolbar">
    <label>{t.language} {renderLanguageSelect(currentLang,changeLanguage)}</label>
    <div className="it-toolbar-right">
     {role==='staff'&&<button className="it-small" onClick={()=>setShowQr(v=>!v)}>{showQr?'💬 '+t.hideQR:'▦ '+t.showQR}</button>}
     <button className="it-small it-end-button" onClick={closeRoom} disabled={busy}>{t.close}</button>
    </div>
   </div>
   {role==='staff'&&showQr&&<div className="it-qr-card">
    <p className="it-scan-en">Talk with Station Staff</p>
    <p className="it-scan-sub">Scan to start a live translated chat.</p>
    {qrData?<img className="it-qr" src={qrData} alt="승객 입장용 일회성 QR코드"/>:<div className="it-qr it-qr-placeholder">QR…</div>}
    <p className="it-noapp">No app installation · No sign-up</p>
    <p className="it-scan-jp">駅員との翻訳チャット · アプリ不要</p>
    <p className="it-scan-cn">扫码与车站工作人员交流 · 无需安装</p>
    <div className="it-qr-actions">
     <button onClick={copyLink}>{copied?t.copied:t.share}</button>
     <button onClick={()=>setShowQr(false)}>{t.hideQR} →</button>
    </div>
   </div>}
   {(!showQr||role==='guest')&&<>
    <div className="it-presence">
     <span className={'it-presence-dot'+(room.guestJoined?' ready':'')}/>
     {room.guestJoined?t.joined:t.waiting}
     <small>{t.time}</small>
    </div>
    <div className="it-messages" ref={scrollRef} aria-live="polite">
     {messages.length===0&&<div className="it-empty">
      <div>💬</div>
      <b>{room.guestJoined?t.tagline:t.waitingHint}</b>
      <p>{t.explain}</p>
     </div>}
     {messages.map(m=>{
      const own=m.sender===role;
      const rendered=own?m.original:m.translated;
      const counterpart=own?m.translated:m.original;
      return <div className={'it-message '+(own?'it-mine':'it-theirs')} key={m.id}>
       <span className="it-msg-who">{own?(role==='staff'?t.staff:t.guest):(role==='staff'?t.guest:t.staff)} · {label(own?m.sourceLang:m.targetLang)}</span>
       <div className="it-bubble">{rendered}</div>
       <div className="it-msg-tools">
        <button onClick={()=>setExpanded(prev=>({...prev,[m.id]:!prev[m.id]}))}>{expanded[m.id]?t.hideOther:t.seeOther}</button>
        {!own&&<button onClick={()=>speak(rendered)}>🔊 {t.listen}</button>}
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
      <button type="button" onClick={voiceInput} disabled={!room.guestJoined||sending} className={'it-voice'+(listening?' listening':'')}>{listening?'■ '+t.stopVoice:'🎙 '+t.voice}</button>
      <button type="submit" disabled={!draft.trim()||!room.guestJoined||sending} className="it-submit">{sending?'…':t.send+' ↗'}</button>
     </div>
     <p>{t.check}</p>
    </form>
   </>}
  </section>}
  {error&&mode!=='ended'&&<div role="alert" className="it-error">{error}<button onClick={()=>setError('')} aria-label="Close">×</button></div>}
  <footer className="it-footer">SUBWAY AI GUIDE · TEMPORARY TEST ROOM <span>· {t.limit}</span></footer>
 </main>;
}
