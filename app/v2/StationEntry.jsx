'use client';
import {useEffect,useRef,useState} from 'react';
import V2Guide from './V2Guide';
import {searchStationMaster,stationMaster} from '../lib/station-master';
import {readStationEntry,stationEntryUrl} from '../lib/station-entry';
import './station-entry.css';
const ui={
 ko:{loading:'기준역을 확인하고 있습니다.',choose:'기준역 선택',share:'QR 입력 주소',close:'닫기',search:'역명·역코드',line:'호선',all:'전체',select:'선택',home:'메인 화면 주소',gate:'게이트 안내 주소',copy:'복사',copied:'주소를 복사했습니다.',manual:'자동 복사가 지원되지 않습니다. 주소를 선택해 복사해 주세요.',invalid:'지원하지 않는 기준역 주소입니다.',invalidHelp:'QR 제공자에게 주소를 확인해 주세요. 다른 역으로 자동 연결하지 않습니다.',none:'검색 결과가 없습니다.',more:'검색어 또는 호선을 선택해 목록을 좁혀 주세요.',note:'현재 선택한 언어로 열리는 주소입니다. QR은 복사한 주소로 생성해 주세요.',previous:'뒤로'},
 en:{loading:'Checking the station…',choose:'Select base station',share:'QR code URL',close:'Close',search:'Station name or code',line:'Line',all:'All',select:'Select',home:'Home link',gate:'Gate guide link',copy:'Copy',copied:'Link copied.',manual:'Select the address and copy it manually.',invalid:'This station link is not supported.',invalidHelp:'Check the QR address with its provider. No other station has been selected.',none:'No stations found.',more:'Narrow the list by name or line.',note:'Links open in the current language. Use the copied address to create a QR code.',previous:'Back'},
 ja:{loading:'基準駅を確認しています。',choose:'基準駅を選択',share:'QRコード用URL',close:'閉じる',search:'駅名・駅コード',line:'路線',all:'すべて',select:'選択',home:'ホーム画面のリンク',gate:'改札案内のリンク',copy:'コピー',copied:'リンクをコピーしました。',manual:'アドレスを選択してコピーしてください。',invalid:'この駅のアドレスには対応していません。',invalidHelp:'QRコードの提供者にアドレスをご確認ください。別の駅には接続しません。',none:'該当する駅がありません。',more:'駅名や路線で絞り込んでください。',note:'現在選択中の言語で開くリンクです。コピーしたアドレスでQRコードを作成してください。',previous:'戻る'},
 zh:{loading:'正在确认基准车站。',choose:'选择基准车站',share:'二维码地址',close:'关闭',search:'车站名称或代码',line:'线路',all:'全部',select:'选择',home:'首页链接',gate:'闸机指南链接',copy:'复制',copied:'链接已复制。',manual:'请选中地址并手动复制。',invalid:'不支持此车站地址。',invalidHelp:'请向二维码提供者确认地址，不会自动切换到其他车站。',none:'未找到车站。',more:'请按站名或线路缩小范围。',note:'链接以当前所选语言打开，请使用复制的地址生成二维码。',previous:'返回'}
};
export default function StationEntry({basePath='/v2',selectorEnabled=true}){
 const [entry,setEntry]=useState(null),[panel,setPanel]=useState(null),[query,setQuery]=useState(''),[line,setLine]=useState(''),[notice,setNotice]=useState(''),[addressesOpen,setAddressesOpen]=useState(false);
 const dialog=useRef(null),language=useRef('ko');
 useEffect(()=>{
  function sync(){const next=readStationEntry(window.location.href);language.current=next.language;setEntry(next);setPanel(null);
   if(next.station){const url=new URL(window.location.href);url.searchParams.set('station',next.code);if(next.legacyGate){url.searchParams.set('view','gate');url.searchParams.set('lang',next.language);url.searchParams.delete('from');}window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);}}
  sync();window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);
 },[]);
 useEffect(()=>{if(panel&&!dialog.current?.open)dialog.current?.showModal();else if(!panel&&dialog.current?.open)dialog.current.close();},[panel]);
 const t=ui[entry?.language||'ko'];
 function open(kind){setQuery('');setLine(entry?.station?.line||'');setNotice('');setAddressesOpen(false);setPanel(kind);}
 function choose(station){
  const url=stationEntryUrl({origin:window.location.origin,basePath,stationCode:station.stationCode,language:language.current});
  window.history.pushState({sagV2:true,sagV2Depth:(window.history.state?.sagV2Depth||0)+1},'',url);
  const next=readStationEntry(url);setEntry(next);setNotice('');
 }
 function changedLanguage(lang){language.current=lang;setEntry(previous=>({...previous,language:lang}));}
 async function copy(value,input){try{await navigator.clipboard.writeText(value);setNotice(t.copied);}catch{input?.focus();input?.select();setNotice(t.manual);}}
 const options=searchStationMaster(query,line);
 const lines=[...new Set(stationMaster.map(s=>s.line))].sort((a,b)=>Number(a)-Number(b));
 const tools=entry?.station?<div className="se-tools"><span className="se-line" style={{background:entry.station.color}}>{entry.station.line}</span>{selectorEnabled?<button className="se-station" onClick={()=>open('select')} aria-label={t.choose}>{entry.station.names[entry.language]} <span aria-hidden="true">⌄</span></button>:<strong className="se-station">{entry.station.names[entry.language]}</strong>}</div>:null;
 return <>{!entry?<p className="se-loading">{ui.ko.loading}</p>:!entry.station?<main className="se-invalid"><h1>{t.invalid}</h1><p>{t.invalidHelp}</p><code>{entry.code||'—'}</code>{selectorEnabled&&<button onClick={()=>open('select')}>{t.choose}</button>}</main>:<V2Guide key={entry.code} basePath={basePath} stationContext={entry.station} initialLanguage={entry.language} onLanguageChange={changedLanguage} stationTools={tools}/>}
 <dialog ref={dialog} className="se-dialog" aria-labelledby="se-title" onCancel={()=>setPanel(null)} onClose={()=>setPanel(null)}><div className="se-heading"><div className="se-title-group"><h2 id="se-title">{t.choose}</h2>{entry?.station&&<span className="se-current-station"><span className="se-line" style={{background:entry.station.color}}>{entry.station.line}</span><strong>{entry.station.names[entry.language]}</strong></span>}</div>{entry?.station&&<button className="se-address-toggle" aria-expanded={addressesOpen} aria-controls="se-current-addresses" onClick={()=>{setAddressesOpen(v=>!v);setNotice('');}}>{t.share}<span className="se-address-caret" aria-hidden="true">⌄</span></button>}<button onClick={()=>setPanel(null)} aria-label={t.close}>×</button></div>
 {panel==='select'&&selectorEnabled?<><div id="se-current-addresses" className="se-addresses" hidden={!addressesOpen}><>{[[false,t.home],[true,t.gate]].map(([gate,label])=>{const url=stationEntryUrl({origin:window.location.origin,basePath,stationCode:entry.code,language:entry.language,gate});return <div className="se-url" key={label}><label>{label}<input readOnly value={url} onFocus={e=>e.target.select()}/></label><button onClick={e=>copy(url,e.currentTarget.parentElement.querySelector('input'))}>{t.copy}</button></div>;})}<p className="se-muted">{t.note}</p><p role="status">{notice}</p></></div><div className="se-filters"><label>{t.search}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="종각 / Jonggak / 0152"/></label></div><nav className="se-line-filters" aria-label={t.line}><button aria-pressed={!line} onClick={()=>setLine('')}>{t.all}</button>{lines.map(n=><button key={n} aria-label={t.line+' '+n} aria-pressed={line===n} onClick={()=>setLine(n)}><span className="se-line" style={{background:stationMaster.find(s=>s.line===n).color}}>{n}</span></button>)}</nav><div className="se-options">{options.map(s=><button key={s.stationCode} data-station-code={s.stationCode} aria-pressed={entry?.code===s.stationCode} onClick={()=>choose(s)} aria-label={s.line+' · '+s.names[entry?.language||'ko']+' · '+s.stationCode}><span className="se-line" style={{background:s.color}}>{s.line}</span><strong>{s.names[entry?.language||'ko']}</strong><code>{s.stationCode}</code></button>)}</div>{!options.length&&<p>{t.none}</p>}</>:null}
 </dialog></>;
}
