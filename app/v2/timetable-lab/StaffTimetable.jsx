'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {CONGESTION_THRESHOLDS} from '../../lib/congestion-data';
const TimetableLab=dynamic(()=>import('./TimetableLab'),{ssr:false});
const empty={data:{},hours:[5,25],slotsPerHour:2,thresholds:CONGESTION_THRESHOLDS,sourceDate:null,source:'api'};
export default function StaffTimetable({lang,stationContext}){
 const code=stationContext?.stationCode||'0154';
 const [source,setSource]=useState(null);
 useEffect(()=>{
  let stopped=false,pending=false,controller;
  setSource(null);
  async function load(){
   if(stopped||pending||document.visibilityState!=='visible')return;
   pending=true;controller=new AbortController();
   try{
    const r=await fetch('/api/v2/timetable-lab/crowding?station='+encodeURIComponent(code),{cache:'no-store',signal:controller.signal});
    if(!r.ok)throw Error('unavailable');
    const data=await r.json();
    if(data.stationCode!==code||!data?.data||!Array.isArray(data.thresholds))throw Error('invalid');
    if(!stopped)setSource(data);
   }catch{if(!stopped)setSource(null);}
   finally{pending=false;}
  }
  void load();
  // Revalidate the tiny per-station response periodically; upstream data is shared and cached daily.
  const timer=setInterval(load,300000);
  const wake=()=>{if(document.visibilityState==='visible')void load();};
  document.addEventListener('visibilitychange',wake);
  return()=>{stopped=true;clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',wake);};
 },[code]);
 return <TimetableLab embedded crowdingSource={source?.stationCode===code?source:empty} stationContext={stationContext} language={lang}/>;
}
