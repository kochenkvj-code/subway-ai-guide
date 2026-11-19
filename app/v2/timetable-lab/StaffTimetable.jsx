'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {copy} from './copy';
const TimetableLab=dynamic(()=>import('./TimetableLab'),{ssr:false});
export default function StaffTimetable({lang,stationContext}){
 const [source,setSource]=useState(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const t=copy[lang]||copy.ko;
 useEffect(()=>{
  const controller=new AbortController();
  setFailed(false);setSource(null);
  fetch('/api/v2/timetable-lab/crowding',{cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('unavailable');const data=await r.json();if(!data?.data||!Array.isArray(data.thresholds))throw Error('invalid');if(!controller.signal.aborted)setSource(data);})
   .catch(()=>{if(!controller.signal.aborted)setFailed(true);});
  return()=>controller.abort();
 },[retry]);
 if(!source)return <div className="tl-staff-loading" role={failed?'alert':'status'}>{failed?t.failed:t.loading}{failed&&<button type="button" onClick={()=>setRetry(n=>n+1)}>{t.retry}</button>}</div>;
 return <TimetableLab embedded crowdingSource={source} stationContext={stationContext} language={lang}/>;
}
