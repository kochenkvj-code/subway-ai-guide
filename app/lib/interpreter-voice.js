// Browser recognition only; never sends audio or transcripts to an additional service.
export function createInterpreterVoice({Recognition,locale,onText,onListening,onError,onDone,timers={setTimeout:(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimeout:id=>globalThis.clearTimeout(id)}}){
 const recognizer=new Recognition();let active=false,closed=false,stopping=false,latest='',notice=null;
 recognizer.lang=locale;recognizer.interimResults=true;recognizer.continuous=false;recognizer.maxAlternatives=1;
 function clearNotice(){if(notice!==null)timers.clearTimeout(notice);notice=null;}
 function finish(error){
  if(closed)return;closed=true;active=false;clearNotice();
  recognizer.onresult=recognizer.onerror=recognizer.onend=null;
  try{recognizer.abort();}catch{}
  onListening(false);onDone();if(error&&error!=='aborted')onError(error);
 }
 recognizer.onresult=event=>{
  if(!active)return;
  const text=Array.from(event.results||[]).map(row=>row[0]?.transcript||'').join(' ').trim();
  if(text){latest=text;clearNotice();onText(text);}
 };
 recognizer.onerror=event=>{if(active)finish(event.error||'unknown');};
 recognizer.onend=()=>{if(active)finish(latest?'':'no-speech');};
 return {
  // Slow Safari results must not be discarded by a fixed-duration abort.
  start(){if(active||closed)return;active=true;onListening(true);notice=timers.setTimeout(()=>{notice=null;if(active&&!latest)onError('delayed');},15000);try{recognizer.start();}catch{finish('start-failed');}},
  stop(){if(!active||stopping)return;stopping=true;onListening(false);try{recognizer.stop();}catch{finish(latest?'':'start-failed');}},
  get stopping(){return stopping;},
  abort(){finish();}
 };
}

export function interpreterVoiceError(code,lang){
 const messages={
 ko:{unsupported:'이 브라우저는 음성인식을 지원하지 않습니다. 키보드로 입력해 주세요.',language:'이 기기에서 선택한 언어의 음성인식을 사용할 수 없습니다. 키보드로 입력해 주세요.',permission:'음성인식 또는 마이크 권한을 허용해 주세요.',timeout:'음성인식 결과를 기다리고 있습니다. 중지하거나 키보드로 입력할 수 있습니다.',empty:'말씀을 인식하지 못했습니다. 다시 시도하거나 키보드로 입력해 주세요.',generic:'음성인식을 완료하지 못했습니다. 다시 시도하거나 키보드로 입력해 주세요.'},
 en:{unsupported:'Speech recognition is unavailable in this browser. Please type your message.',language:'Speech recognition for this language is unavailable on this device. Please type your message.',permission:'Please allow microphone and speech recognition access.',timeout:'Waiting for speech recognition results. You can stop or type your message.',empty:'No speech was recognized. Try again or type your message.',generic:'Speech recognition could not finish. Try again or type your message.'},
 ja:{unsupported:'このブラウザでは音声認識を利用できません。文字で入力してください。',language:'この端末では選択した言語の音声認識を利用できません。文字で入力してください。',permission:'マイクと音声認識の使用を許可してください。',timeout:'音声認識の結果を待っています。停止するか、文字で入力できます。',empty:'音声を認識できませんでした。再試行するか、文字で入力してください。',generic:'音声認識を完了できませんでした。再試行するか、文字で入力してください。'},
 zh:{unsupported:'此浏览器无法使用语音识别，请输入文字。',language:'此设备无法识别所选语言，请输入文字。',permission:'请允许使用麦克风和语音识别。',timeout:'正在等待语音识别结果，您可以停止或输入文字。',empty:'未能识别语音，请重试或输入文字。',generic:'语音识别未能完成，请重试或输入文字。'}
 };
 const kind=code==='delayed'?'timeout':code==='unsupported'?'unsupported':code==='language-not-supported'?'language':['not-allowed','service-not-allowed','audio-capture'].includes(code)?'permission':code==='timeout'?'timeout':code==='no-speech'?'empty':'generic';
 return (messages[lang]||messages.en)[kind];
}
