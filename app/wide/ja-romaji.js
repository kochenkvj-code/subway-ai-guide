// Wide-only Japanese romaji input: local, synchronous, and usable offline.
// This is a compact station/travel candidate IME, not a general-purpose OS dictionary.
import {stationMaster} from '../lib/station-master';

const VOWELS='aiueo';
const ROWS={
 '': 'あいうえお',k:'かきくけこ',g:'がぎぐげご',
 s:'さしすせそ',z:'ざじずぜぞ',
 t:'たちつてと',d:'だぢづでど',
 n:'なにぬねの',h:'はひふへほ',b:'ばびぶべぼ',p:'ぱぴぷぺぽ',
 m:'まみむめも',r:'らりるれろ',
};
const MAP={};
for(const [c,syllables] of Object.entries(ROWS)){
 [...syllables].forEach((kana,i)=>{MAP[c+VOWELS[i]]=kana;});
}
Object.assign(MAP,{
 shi:'し',si:'し',chi:'ち',ti:'ち',tsu:'つ',tu:'つ',fu:'ふ',hu:'ふ',
 ji:'じ',zi:'じ',di:'ぢ',du:'づ',
 ya:'や',yu:'ゆ',yo:'よ',ye:'いぇ',
 wa:'わ',wi:'うぃ',we:'うぇ',wo:'を',nn:'ん',
 sha:'しゃ',shu:'しゅ',sho:'しょ',she:'しぇ',
 sya:'しゃ',syu:'しゅ',syo:'しょ',
 cha:'ちゃ',chu:'ちゅ',cho:'ちょ',che:'ちぇ',
 cya:'ちゃ',cyu:'ちゅ',cyo:'ちょ',tya:'ちゃ',tyu:'ちゅ',tyo:'ちょ',
 ja:'じゃ',ju:'じゅ',jo:'じょ',je:'じぇ',
 jya:'じゃ',jyu:'じゅ',jyo:'じょ',
 tsa:'つぁ',tsi:'つぃ',tse:'つぇ',tso:'つぉ',
 fa:'ふぁ',fi:'ふぃ',fe:'ふぇ',fo:'ふぉ',
 va:'ゔぁ',vi:'ゔぃ',vu:'ゔ',ve:'ゔぇ',vo:'ゔぉ',
 qa:'くぁ',qi:'くぃ',qe:'くぇ',qo:'くぉ',xa:'ぁ',xi:'ぃ',xu:'ぅ',xe:'ぇ',xo:'ぉ',
 la:'ぁ',li:'ぃ',lu:'ぅ',le:'ぇ',lo:'ぉ',
 xtsu:'っ',ltsu:'っ',xtu:'っ',ltu:'っ',
 xya:'ゃ',xyu:'ゅ',xyo:'ょ',lya:'ゃ',lyu:'ゅ',lyo:'ょ',xwa:'ゎ',
});
for(const [consonant,iKana] of Object.entries({
 k:'き',g:'ぎ',s:'し',z:'じ',t:'ち',d:'ぢ',n:'に',h:'ひ',b:'び',p:'ぴ',m:'み',r:'り'
})){
 for(const [v,kana] of Object.entries({a:'ゃ',u:'ゅ',o:'ょ'})){
  MAP[consonant+'y'+v]=iKana+kana;
 }
}
Object.assign(MAP,{
 kya:'きゃ',kyu:'きゅ',kyo:'きょ',gya:'ぎゃ',gyu:'ぎゅ',gyo:'ぎょ',
 nya:'にゃ',nyu:'にゅ',nyo:'にょ',hya:'ひゃ',hyu:'ひゅ',hyo:'ひょ',
 bya:'びゃ',byu:'びゅ',byo:'びょ',pya:'ぴゃ',pyu:'ぴゅ',pyo:'ぴょ',
 mya:'みゃ',myu:'みゅ',myo:'みょ',rya:'りゃ',ryu:'りゅ',ryo:'りょ',
});
const ROMAJI_KEYS=Object.keys(MAP).sort((a,b)=>b.length-a.length);
function hiraToKata(text){return text.replace(/[\u3041-\u3096]/g,ch=>String.fromCharCode(ch.charCodeAt(0)+96));}
function kataToHira(text){return text.replace(/[\u30a1-\u30f6]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-96));}

export function romajiToKana(input,{katakana=false,finalize=false}={}){
 const raw=String(input).toLowerCase();
 let result='';
 for(let i=0;i<raw.length;){
  const remaining=raw.slice(i),here=remaining[0],next=remaining[1];
  if(here==='n'&&next==="'"){result+='ん';i+=2;continue;}
  if(here==='n'&&!next){result+=finalize?'ん':'n';i++;continue;}
  if(here==='n'&&next==='n'&&!/[aiueoy]/.test(remaining[2]||'')){result+='ん';i+=2;continue;}
  if(here==='n'&&next&&!/[aiueoyn]/.test(next)){result+='ん';i++;continue;}
  if(here==='n'&&next==='n'){result+='ん';i++;continue;}
  if(here===next&&/[bcdfghjklmpqrstvwxyz]/.test(here)&&here!=='n'){result+='っ';i++;continue;}
  const key=ROMAJI_KEYS.find(k=>remaining.startsWith(k));
  if(key){result+=MAP[key];i+=key.length;continue;}
  result+=here;i++;
 }
 return katakana?hiraToKata(result):result;
}
const REVERSE=Object.entries(MAP).filter(([roman])=>!roman.startsWith('l')&&!roman.startsWith('x')&&!/^(si|ti|tu|hu|zi|di|du|sya|syu|syo|tya|tyu|tyo)$/.test(roman))
 .sort((a,b)=>b[1].length-a[1].length||a[0].length-b[0].length);
function kanaToRomaji(text){
 const s=kataToHira(String(text)),out=[];
 for(let i=0;i<s.length;){
  const ch=s[i];
  if(ch==='っ'){
   const next=REVERSE.find(([,kana])=>s.slice(i+1).startsWith(kana));
   if(next){out.push(next[0][0]);i++;continue;}
  }
  if(ch==='ん'){out.push('n');i++;continue;}
  if(ch==='ー'){const previous=out.at(-1)||'';out.push(previous.match(/[aiueo]$/)?.[0]||'');i++;continue;}
  const found=REVERSE.find(([,kana])=>s.slice(i).startsWith(kana));
  if(found){out.push(found[0]);i+=found[1].length;}
  else{i++;}
 }
 return out.join('');
}
const BASIC=[
 ['eki','駅'],['eki','えき'],['densha','電車'],['chikatetsu','地下鉄'],
 ['norikae','乗り換え'],['deguchi','出口'],['iriguchi','入口'],
 ['kippu','切符'],['koutsuukaado','交通カード'],['suika','Suica'],
 ['toire','トイレ'],['erebeetaa','エレベーター'],['hoteru','ホテル'],
 ['rotte','ロッテ'],['rottehoteru','ロッテホテル'],['lottehotel','ロッテホテル'],
 ['wasuremono','忘れ物'],['saifu','財布'],['sumaho','スマホ'],['baggu','バッグ'],
 ['kankou','観光'],['annaijo','案内所'],['shinpai','心配'],
 ['michi','道'],['ikikata','行き方'],['ikimasu','行きます'],['doko','どこ'],
 ['koko','ここ'],['nanban','何番'],['nanji','何時'],['nanpun','何分'],
 ['arigatou','ありがとう'],['sumimasen','すみません'],['onegaishimasu','お願いします'],
 ['shinjuku','新宿'],['tokyo','東京'],['toukyou','東京'],['shibuya','渋谷'],
 ['ueno','上野'],['akihabara','秋葉原'],['asakusa','浅草'],['ginza','銀座'],
 ['seouru','ソウル'],['seoul','ソウル'],['souru','ソウル'],['sourueki','ソウル駅'],
 ['kankoku','韓国'],['myondon','明洞'],['myeongdong','明洞'],['myeondong','明洞'],
 ['toudainmon','東大門'],['dongdaemun','東大門'],['konbukkun','景福宮'],
 ['kanbokkun','景福宮'],['gangnam','江南'],['kannamu','江南'],
 ['chonno','鍾路'],['jongno','鍾路'],['chonnogoga','チョンノオガ'],
 ['jongno5','チョンノオガ'],['siiteingu','市庁'],['sichou','市庁']
];
const DICT=[...BASIC,...stationMaster.flatMap(s=>{
 const ja=s.names?.ja||'',english=s.names?.en||'';
 const englishKey=english.toLowerCase().replace(/[^a-z0-9]/g,'');
 const readingKey=kanaToRomaji(ja);
 return [...new Set([readingKey,englishKey])].filter(key=>key.length>=3).map(key=>[key,ja]);
})];
const DISTINCT=[...new Map(DICT.map(([key,value])=>[key+'\0'+value,[key,value]])).values()];
const COMMON=['駅','出口','乗り換え','ホテル','ロッテホテル','切符','財布','忘れ物','トイレ','ソウル'];

export function japaneseCandidates(romaji='',rendered=''){
 const key=String(romaji).toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!key)return COMMON;
 if(key.length<2)return [];
 const normalizedKana=kataToHira(rendered||'');
 const candidates=DISTINCT.filter(([roman,value])=>
  roman===key||key.length>=3&&roman.startsWith(key)||value===rendered||kataToHira(value)===normalizedKana
 ).sort((a,b)=>(a[0]===key?0:1)-(b[0]===key?0:1)||a[0].length-b[0].length);
 return [...new Set(candidates.map(([,value])=>value))].slice(0,7);
}
