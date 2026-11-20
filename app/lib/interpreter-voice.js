// Speech events and message delivery are independent. No extra audio service is used.
const browserTimers={setTimeout:(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimeout:id=>globalThis.clearTimeout(id)};
export function createInterpreterVoice({Recognition,locale,onText,onFinal=()=>{},onListening,onError,onDone=()=>{},timers=browserTimers}){
 let wanted=false,disposed=false,current=null,restart=null,boundary=null,emptyEnds=0;
 const pauses=new Set();
 function clearRestart(){if(restart!==null)timers.clearTimeout(restart);restart=null;}
 function clearBoundary(){if(boundary!==null)timers.clearTimeout(boundary);boundary=null;}
 function detach(){
  clearBoundary();
  const old=current;current=null;
  if(old){old.rec.onresult=old.rec.onerror=old.rec.onend=old.rec.onspeechend=null;try{old.rec.abort();}catch{}}
  onListening(false);
 }
 function fail(code){wanted=false;clearRestart();detach();onError(code);onDone();}
 function begin(){
  clearRestart();if(disposed||!wanted||pauses.size||current)return;
  let rec;try{rec=new Recognition();}catch{fail('start-failed');return;}
  const session={rec,seen:new Set(),heard:false,interim:'',ending:false};current=session;
  rec.lang=locale;rec.interimResults=true;
  // One native utterance at a time: Safari may retain interim Chinese results
  // indefinitely in continuous mode. Logical continuous mode uses guarded restart.
  rec.continuous=false;rec.maxAlternatives=1;
  const valid=()=>!disposed&&current===session;
  function endUtterance(){
   clearBoundary();if(!valid()||session.ending)return;
   session.ending=true;try{rec.stop();}catch(error){
    // Some engines are already closing by the time speechend is delivered.
    if(error?.name!=='InvalidStateError')fail('start-failed');
   }
  }
  rec.onspeechend=endUtterance;
  rec.onresult=event=>{
   if(!valid())return;
   const results=Array.from(event.results||[]),finals=[];
   for(let i=event.resultIndex||0;i<results.length;i++){
    const row=results[i],text=(row[0]?.transcript||'').trim();
    if(row.isFinal&&!session.seen.has(i)){session.seen.add(i);if(text)finals.push(text);}
   }
   const interim=results.filter(row=>!row.isFinal).map(row=>row[0]?.transcript||'').join(' ').trim();
   if(interim!==session.interim){
    clearBoundary();session.interim=interim;
    // Ask the native engine to finalize after stable partial text. Never send
    // the partial itself, and keep accepting revised/final results after stop().
    if(interim&&!session.ending)boundary=timers.setTimeout(endUtterance,900);
   }
   if(interim||finals.length){session.heard=true;emptyEnds=0;}
   // Capture the entire event before callbacks can pause/abort the native session.
   onText(interim);for(const text of finals)onFinal(text);
  };
  rec.onerror=event=>{if(!valid())return;if(event.error==='no-speech'){return;}fail(event.error||'unknown');};
  rec.onend=()=>{
   if(!valid())return;clearBoundary();current=null;rec.onresult=rec.onerror=rec.onend=rec.onspeechend=null;onListening(false);
   if(session.interim){fail('unconfirmed');return;}
   if(!wanted){onDone();return;}
   if(pauses.size)return;
   if(!session.heard&&++emptyEnds>=3){fail('no-speech');return;}
   restart=timers.setTimeout(begin,300);
  };
  try{rec.start();if(valid())onListening(true);}catch{fail('start-failed');}
 }
 return {
  start(){if(disposed)return;wanted=true;emptyEnds=0;begin();},
  // OFF stops further capture; a final result already being resolved is still accepted.
  stop(){wanted=false;clearRestart();clearBoundary();onListening(false);if(current&&!current.ending){current.ending=true;try{current.rec.stop();}catch{detach();}}},
  pause(reason){pauses.add(reason);clearRestart();detach();},
  resume(reason){pauses.delete(reason);begin();},
  get wanted(){return wanted;},
  get stopping(){return !wanted;},
  abort(){disposed=true;wanted=false;clearRestart();detach();onDone();}
 };
}

// One transport request at a time, retaining the same ID on retry.
export function createInterpreterOutbox({send,onChange,onError,onIdle=()=>{},limit=36}){
 let items=[],active=false,failed=false,closed=false;
 const snapshot=()=>({items:[...items],active,failed});
 const emit=()=>{if(!closed)onChange(snapshot());};
 async function pump(){
  if(closed||active||failed||!items.length)return;
  active=true;emit();const item=items[0];
  try{await send(item);if(closed)return;items.shift();}
  catch(error){if(closed)return;failed=true;onError(error);}
  finally{if(!closed){active=false;emit();if(!failed){if(items.length)pump();else onIdle();}}}
 }
 return {
  enqueue(item){if(closed||items.length>=limit)return false;items.push(item);emit();pump();return true;},
  retry(){if(closed)return;failed=false;emit();pump();},
  get state(){return snapshot();},
  close(){closed=true;items=[];}
 };
}

export function interpreterVoiceError(code,lang){
 const messages={
 ko:{unconfirmed:'음성 내용을 확정하지 못했습니다. 입력창의 내용을 확인한 뒤 전송해 주세요.',unsupported:'이 브라우저는 음성인식을 지원하지 않습니다. 키보드로 입력해 주세요.',language:'이 기기에서 선택한 언어의 음성인식을 사용할 수 없습니다. 키보드로 입력해 주세요.',permission:'음성인식 또는 마이크 권한을 허용해 주세요.',timeout:'음성인식 결과를 기다리고 있습니다. 중지하거나 키보드로 입력할 수 있습니다.',empty:'말씀을 인식하지 못했습니다. 다시 시도하거나 키보드로 입력해 주세요.',generic:'음성인식을 완료하지 못했습니다. 다시 시도하거나 키보드로 입력해 주세요.'},
 en:{unconfirmed:'Speech could not be finalized. Review the text and send it manually.',unsupported:'Speech recognition is unavailable in this browser. Please type your message.',language:'Speech recognition for this language is unavailable on this device. Please type your message.',permission:'Please allow microphone and speech recognition access.',timeout:'Waiting for speech recognition results. You can stop or type your message.',empty:'No speech was recognized. Try again or type your message.',generic:'Speech recognition could not finish. Try again or type your message.'},
 ja:{unconfirmed:'音声を確定できませんでした。入力欄を確認して送信してください。',unsupported:'このブラウザでは音声認識を利用できません。文字で入力してください。',language:'この端末では選択した言語の音声認識を利用できません。文字で入力してください。',permission:'マイクと音声認識の使用を許可してください。',timeout:'音声認識の結果を待っています。停止するか、文字で入力できます。',empty:'音声を認識できませんでした。再試行するか、文字で入力してください。',generic:'音声認識を完了できませんでした。再試行するか、文字で入力してください。'},
 zh:{unconfirmed:'未能确认语音，请检查输入框中的文字后手动发送。',unsupported:'此浏览器无法使用语音识别，请输入文字。',language:'此设备无法识别所选语言，请输入文字。',permission:'请允许使用麦克风和语音识别。',timeout:'正在等待语音识别结果，您可以停止或输入文字。',empty:'未能识别语音，请重试或输入文字。',generic:'语音识别未能完成，请重试或输入文字。'}
 };
 const kind=code==='unconfirmed'?'unconfirmed':code==='delayed'?'timeout':code==='unsupported'?'unsupported':code==='language-not-supported'?'language':['not-allowed','service-not-allowed','audio-capture'].includes(code)?'permission':code==='timeout'?'timeout':code==='no-speech'?'empty':'generic';
 return (messages[lang]||messages.en)[kind];
}
