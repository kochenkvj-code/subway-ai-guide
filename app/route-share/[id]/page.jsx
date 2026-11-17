'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import RouteResult from '../../v2/route-lab/RouteResult';
import {shareCopy} from '../../v2/route-lab/RouteShareButton';
import '../../v2/route-lab/route-lab.css';
export default function SharedRoute(){
 const {id}=useParams(),[result,setResult]=useState(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/route-shares?id='+encodeURIComponent(id),{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();const data=await r.json();if(active)setResult(data);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[id]);
 const s=result?.snapshot,lang=s?.language||'en',t=shareCopy[lang];
 return <main className="route-lab rl-shared" lang={lang==='zh'?'zh-CN':lang}><div className="rl-shell"><header className="rl-top"><h1>{t.saved}</h1>{s&&<><p>{new Date(s.searchedAt).toLocaleString(lang,{timeZone:'Asia/Seoul'})} · KST</p><a href={'/?station='+s.originCode+'&lang='+lang}>{t.home}</a></>}</header>{error?<p role="alert">{t.expired}</p>:!s?<p role="status">…</p>:<RouteResult route={s.route} place={s.place} lang={lang}/>}</div></main>;
}
