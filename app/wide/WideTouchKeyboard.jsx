'use client';
import {useEffect,useRef,useState} from 'react';
import zhStationPinyin from './zh-station-pinyin.json';

// Wide View only. This keyboard never touches the shared/mobile V2 components.
const KO=[
 ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
 ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
 ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ']
];
const EN=[
 ['q','w','e','r','t','y','u','i','o','p'],
 ['a','s','d','f','g','h','j','k','l'],
 ['z','x','c','v','b','n','m']
];
const SYMBOLS=[
 ['1','2','3','4','5','6','7','8','9','0'],
 ['@','#','-','/','(',')',':',';',',','.'],
 ['?','!','%','&','+','=','*','_']
];
const JA=[
 ['あ','い','う','え','お','か','き','く','け','こ'],
 ['さ','し','す','せ','そ','た','ち','つ','て','と'],
 ['な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ'],
 ['ま','み','む','め','も','や','ゆ','よ','ら','り'],
 ['る','れ','ろ','わ','を','ん','ゃ','ゅ','ょ','っ']
];
const INITIAL='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
const MEDIAL='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'.split('');
const FINAL=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const COMPOUND_V={'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ','ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ','ㅡㅣ':'ㅢ'};
const COMPOUND_F={'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
const SHIFT_KO={'ㅂ':'ㅃ','ㅈ':'ㅉ','ㄷ':'ㄸ','ㄱ':'ㄲ','ㅅ':'ㅆ','ㅐ':'ㅒ','ㅔ':'ㅖ'};
const VOICE={'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご','さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ','た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど','は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ'};
const SEMI={'は':'ぱ','ひ':'ぴ','ふ':'ぷ','へ':'ぺ','ほ':'ぽ'};
const CHAR_LABEL={ko:'한국어 · 두벌식',en:'English · QWERTY',ja:'日本語 · かな',zh:'中文 · 拼音'};
const COMPLETE={ko:'완료',en:'Done',ja:'完了',zh:'完成'};
const SPACE={ko:'띄어쓰기',en:'Space',ja:'スペース',zh:'空格'};
const LANGUAGE_LABEL={ko:'한/영',en:'EN/한',ja:'かな/ABC',zh:'拼音/ABC'};
const ZH_WORDS=[
 ['shouer','首尔'],['shouerzhanting','首尔站'],['ditie','地铁'],['ditiezhan','地铁站'],
 ['jiudian','酒店'],['letian','乐天'],['letianjiudian','乐天酒店'],
 ['qianbao','钱包'],['shouji','手机'],['baobao','包包'],['beibao','背包'],
 ['chukou','出口'],['huancheng','换乘'],['luxian','路线'],['zhaoshi','找失物'],
 ['shiwu','失物'],['yishiwupin','遗失物品'],['chepiao','车票'],['jiaotongka','交通卡'],
 ['cesuo','厕所'],['dianti','电梯'],['zai','在'],['qu','去'],['wo','我'],['zenme','怎么'],
 ['nihao','你好'],['xiexie','谢谢'],['qingwen','请问'],['bangzhu','帮助'],
 ['gonggongqiche','公交车'],['zhonglu','钟路'],['mingdong','明洞'],
 ['jingfugong','景福宫'],['jiangnan','江南'],['dongdaemun','东大门'],['shizhengting','市政厅'],
 ['zhan','站'],['shijian','时间'],['jidian','几点'],['shenme','什么'],['zheli','这里'],
 ['nali','哪里'],['duoshao','多少'],['huoche','火车'],['kuaiche','快车'],['anjian','按键']
];
ZH_WORDS.push(...zhStationPinyin);
const JP_COMMON=['駅','出口','乗り換え','ホテル','ロッテホテル','切符','交通カード','財布','スマートフォン','忘れ物','トイレ','エレベーター','景福宮'];
const ZH_COMMON=['地铁','路线','出口','换乘','钱包','乐天酒店','首尔站','钟路','明洞','失物'];

function composeHangul(raw){
 let out='';
 for(let i=0;i<raw.length;){
  const first=raw[i],l=INITIAL.indexOf(first);
  if(l<0||!MEDIAL.includes(raw[i+1])){out+=first;i++;continue;}
  let j=i+1,v=raw[j];
  if(COMPOUND_V[v+(raw[j+1]||'')]){v=COMPOUND_V[v+raw[j+1]];j++;}
  let t='',end=j+1,next=raw[end];
  if(next&&FINAL.includes(next)&&!MEDIAL.includes(raw[end+1])){
   t=next;end++;
   const mixed=COMPOUND_F[t+(raw[end]||'')];
   if(mixed&&!MEDIAL.includes(raw[end+1])){t=mixed;end++;}
  }
  const vIndex=MEDIAL.indexOf(v),tIndex=FINAL.indexOf(t);
  if(vIndex>=0&&tIndex>=0){out+=String.fromCharCode(0xac00+(l*21+vIndex)*28+tIndex);i=end;}
  else{out+=first;i++;}
 }
 return out;
}

function setReactInput(element,text,caret){
 if(!element||!element.isConnected)return;
 const proto=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
 if(!setter)return;
 setter.call(element,text);
 element.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
 try{element.setSelectionRange(caret,caret);}catch{}
 // Do not blur: the caret remains visible, and the browser's own keyboard
 // stays suppressed by inputmode=none in this dedicated touch-screen view.
}

function replaceText(element,content,range){
 const text=element.value;
 const from=range?.start??element.selectionStart??text.length;
 const until=range?.end??element.selectionEnd??from;
 const value=text.slice(0,from)+content+text.slice(until);
 setReactInput(element,value,from+content.length);
 return {start:from,end:from+content.length,value};
}

export default function WideTouchKeyboard({lang='ko',target,onClose}){
 const [symbols,setSymbols]=useState(false);
 const [alt,setAlt]=useState(false);
 const [shift,setShift]=useState(false);
 const [pinyin,setPinyin]=useState('');
 const buffer=useRef({element:null,raw:[],start:0,rendered:''});
 useEffect(()=>{buffer.current={element:null,raw:[],start:0,rendered:''};setSymbols(['number','tel'].includes(target?.type));setAlt(false);setShift(false);setPinyin('');},[target,lang]);
 if(!target)return null;
 const mainMode=symbols?'symbols':alt?'en':lang;
 const rows=mainMode==='symbols'?SYMBOLS:mainMode==='ko'?KO:mainMode==='ja'?JA:EN;
 const isKorean=mainMode==='ko';
 const isKana=mainMode==='ja';
 const isPinyin=mainMode==='zh';
 const choices=isPinyin&&(pinyin?ZH_WORDS.filter(([key])=>key.startsWith(pinyin.toLowerCase())).map(x=>x[1]).slice(0,6):ZH_COMMON);
 const suggestions=isKana?JP_COMMON:isPinyin?choices:[];
 const flush=()=>{buffer.current={element:null,raw:[],start:0,rendered:''};setPinyin('');};
 const insert=(text,asComposition=false)=>{
  if(!target.isConnected){onClose?.();return;}
  const caret=target.selectionStart??target.value.length;
  const saved=buffer.current;
  if(asComposition&&isKorean){
   const canContinue=saved.element===target&&saved.start+saved.rendered.length===caret;
   const active=canContinue?saved:{element:target,raw:[],start:caret,rendered:''};
   // A previous selection is replaced when the first jamo is inserted.
   if(!canContinue&&target.selectionEnd!==caret){
    const end=target.selectionEnd;
    const next=target.value.slice(0,caret)+target.value.slice(end);
    setReactInput(target,next,caret);
   }
   active.raw.push(text);
   const output=composeHangul(active.raw);
   const end=active.start+active.rendered.length;
   replaceText(target,output,{start:active.start,end});
   active.rendered=output;
   buffer.current=active;
   return;
  }
  flush();
  replaceText(target,text);
  if(isPinyin&&/^[a-z]$/i.test(text)){
   const next=text.toLowerCase();
   setPinyin(previous=>previous+next);
  }
 };
 const useCandidate=(word)=>{
  if(isPinyin&&pinyin){
   const caret=target.selectionStart??target.value.length;
   const before=target.value.slice(0,caret);
   // Replace the uncommitted romanized segment without affecting earlier text.
   const n=before.toLowerCase().endsWith(pinyin.toLowerCase())?pinyin.length:0;
   replaceText(target,word,{start:caret-n,end:caret});
  }else replaceText(target,word);
  flush();
 };
 const applyBackspace=()=>{
  const saved=buffer.current;
  const caret=target.selectionStart??target.value.length;
  if(isKorean&&saved.element===target&&saved.raw.length&&saved.start+saved.rendered.length===caret){
   saved.raw.pop();
   const output=composeHangul(saved.raw);
   replaceText(target,output,{start:saved.start,end:saved.start+saved.rendered.length});
   saved.rendered=output;
   if(!saved.raw.length)flush();
   return;
  }
  const start=target.selectionStart??caret,end=target.selectionEnd??caret;
  if(start!==end){replaceText(target,'',{start,end});flush();return;}
  if(!start)return;
  const chars=Array.from(target.value.slice(0,start));
  const previous=chars.at(-1)||'';
  replaceText(target,'',{start:start-previous.length,end:start});
  if(isPinyin)setPinyin(v=>v.slice(0,-1));
  else flush();
 };
 const kanaTransform=(symbol)=>{
  const position=target.selectionStart??target.value.length;
  if(!position)return;
  const last=target.value.slice(position-1,position);
  const isKatakana=/[\u30a1-\u30f6]/.test(last);
  const hiragana=isKatakana?String.fromCharCode(last.charCodeAt(0)-96):last;
  const replacement=(symbol==='voiced'?VOICE:SEMI)[hiragana];
  if(replacement)replaceText(target,isKatakana?String.fromCharCode(replacement.charCodeAt(0)+96):replacement,{start:position-1,end:position});
 };
 const press=(key)=>{
  if(key==='done'){flush();target.blur();onClose?.();return;}
  if(key==='symbols'){flush();setSymbols(v=>!v);return;}
  if(key==='alt'){flush();setAlt(v=>!v);setSymbols(false);return;}
  if(key==='shift'){setShift(v=>!v);return;}
  if(key==='back'){applyBackspace();return;}
  if(key==='space'){insert(' ');return;}
  if(key==='enter'){insert(target.tagName==='TEXTAREA'?'\n':' ');return;}
  if(key==='voiced'||key==='semi'){kanaTransform(key);return;}
  let value=key;
  if(isKorean&&shift)value=SHIFT_KO[key]||key;
  if(isKana&&shift)value=String.fromCharCode(key.charCodeAt(0)+96);
  if((mainMode==='en'||isPinyin)&&shift)value=key.toUpperCase();
  if(isKorean)insert(value,true);
  else if(isPinyin){
   const pos=target.selectionStart??target.value.length;
   replaceText(target,value);
   if(/^[a-z]$/i.test(value))setPinyin(v=>v+value.toLowerCase());
   else setPinyin('');
   buffer.current={element:target,raw:[],start:pos,rendered:''};
  }else insert(value);
  if(shift)setShift(false);
 };
 return <div className="wide-touch-keyboard" data-wide-keyboard="" aria-label={CHAR_LABEL[lang]}>
  <div className="wide-keyboard-bar">
   <span className="wide-keyboard-title"><span aria-hidden="true">⌨</span> {CHAR_LABEL[lang]} {alt?'· ABC':''}{symbols?'· 123':''}</span>
   <button type="button" className="wide-keyboard-close" onPointerDown={e=>e.preventDefault()} onClick={()=>{flush();target.blur();onClose?.();}} aria-label="Close keyboard">×</button>
  </div>
  {suggestions.length>0&&<div className="wide-keyboard-candidates" aria-label={isPinyin?'汉字候选':'よく使う言葉'}>
   {suggestions.map((word,i)=><button type="button" key={word+'-'+i} onPointerDown={e=>e.preventDefault()} onClick={()=>useCandidate(word)}>{word}</button>)}
  </div>}
  <div className="wide-keyboard-keys">
   {rows.map((row,i)=><div className="wide-keyboard-row" key={i}>
    {row.map((key,j)=><button type="button" key={j} className="wide-key" onPointerDown={e=>e.preventDefault()} onClick={()=>press(key)} aria-label={key}>{isKana&&shift?String.fromCharCode(key.charCodeAt(0)+96):isKorean&&shift?(SHIFT_KO[key]||key):shift&&/^[a-z]$/i.test(key)?key.toUpperCase():key}</button>)}
   </div>)}
   <div className="wide-keyboard-row wide-keyboard-actions">
    <button type="button" className="wide-key wide-key-utility" onPointerDown={e=>e.preventDefault()} onClick={()=>press('shift')}>{isKana?(shift?'カナ':'かな'):'⇧'}</button>
    {isKana&&<><button type="button" className="wide-key wide-key-utility" onPointerDown={e=>e.preventDefault()} onClick={()=>press('voiced')}>゛</button><button type="button" className="wide-key wide-key-utility" onPointerDown={e=>e.preventDefault()} onClick={()=>press('semi')}>゜</button></>}
    <button type="button" className="wide-key wide-key-utility" onPointerDown={e=>e.preventDefault()} onClick={()=>press('symbols')}>{symbols?'ABC':'123'}</button>
    <button type="button" className="wide-key wide-key-utility" onPointerDown={e=>e.preventDefault()} onClick={()=>press('alt')}>{LANGUAGE_LABEL[lang]}</button>
    <button type="button" className="wide-key wide-key-space" onPointerDown={e=>e.preventDefault()} onClick={()=>press('space')}>{SPACE[lang]}</button>
    <button type="button" className="wide-key wide-key-utility" onPointerDown={e=>e.preventDefault()} onClick={()=>press('back')} aria-label="Backspace">⌫</button>
    <button type="button" className="wide-key wide-key-done" onPointerDown={e=>e.preventDefault()} onClick={()=>press('done')}>{COMPLETE[lang]} ✓</button>
   </div>
  </div>
 </div>;
}
