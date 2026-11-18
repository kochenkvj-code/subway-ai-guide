'use client';
import {useEffect,useState} from 'react';
import {congestionSlot} from '../lib/congestion-data';
export default function useStationCongestion(active,stationCode){
 const [data,setData]=useState(null);
 useEffect(()=>{
  setData(null);
  if(!active||!stationCode)return;
  let stopped=false,pending=false,lastKey='',lastAttempt=0,controller;
  async function load(){
   if(stopped||pending||document.visibilityState!=='visible')return;
   const key=congestionSlot().key;
   if(lastKey===key)return;
   if(Date.now()-lastAttempt<15000)return;
   lastAttempt=Date.now();pending=true;controller=new AbortController();
   try{
    const r=await fetch('/api/v2/congestion?station='+encodeURIComponent(stationCode),{cache:'no-store',signal:controller.signal});
    const result=await r.json();
    if(!r.ok||result.stationCode!==stationCode||!result.values||result.slot?.key!==congestionSlot().key)throw Error('unavailable');
    if(!stopped){lastKey=result.slot.key;setData(result);}
   }catch{if(!stopped){setData(null);lastAttempt=Date.now()+225000;}}
   finally{pending=false;}
  }
  void load();
  const timer=setInterval(load,15000);
  const wake=()=>{if(document.visibilityState==='visible')void load();};
  document.addEventListener('visibilitychange',wake);
  return()=>{stopped=true;clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',wake);};
 },[active,stationCode]);
 return active&&data?.stationCode===stationCode&&data?.slot?.key===congestionSlot().key?data:null;
}
