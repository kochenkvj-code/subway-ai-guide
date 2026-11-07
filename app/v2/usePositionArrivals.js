'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {stationMaster} from '../lib/station-master';

// Shares the exact realtimePosition endpoint and 30-second refresh policy with
// /arrival-test. Never substitutes the old ETA API when position data is absent.
export default function usePositionArrivals(active,stationCode){
 const [state,setState]=useState({data:null,error:null,loading:false,stationCode});
 const refreshRef=useRef(()=>{});
 const refresh=useCallback(()=>refreshRef.current(true),[]);
 useEffect(()=>{
  if(!active||!stationCode)return;
  const station=stationMaster.find(s=>s.stationCode===stationCode);
  setState(previous=>previous.stationCode===stationCode?previous:{data:null,error:null,loading:false,stationCode});
  let stopped=false,pending=false,controller=null,lastAttempt=0;
  async function load(manual=false){
   if(stopped||pending||document.visibilityState!=='visible'||(manual&&Date.now()-lastAttempt<3000))return;
   lastAttempt=Date.now();
   if(!station){setState({data:null,error:'INVALID_STATION',loading:false,stationCode});return;}
   pending=true;
   controller=new AbortController();
   const current=controller;
   setState(previous=>({...previous,loading:true,error:null}));
   try{
    const response=await fetch('/api/arrival-test/position?line='+encodeURIComponent(station.line),{cache:'no-store',signal:current.signal});
    const data=await response.json();
    const providerCode=data.raw?.errorMessage?.code||data.raw?.RESULT?.CODE;
    if(!response.ok||(providerCode&&!['INFO-000','INFO-200'].includes(providerCode)))throw Error(data.error||providerCode||'POSITION_ERROR');
    if(String(data.line)!==String(station.line))throw Error('POSITION_LINE_MISMATCH');
    if(!Array.isArray(data.raw?.realtimePositionList)&&providerCode!=='INFO-200')throw Error('INVALID_POSITION_DATA');
    if(!stopped&&!current.signal.aborted)setState({data,error:null,loading:false,stationCode});
   }catch(error){
    if(!stopped&&!current.signal.aborted)setState({data:null,error:String(error.message||error),loading:false,stationCode});
   }finally{
    pending=false;
    if(controller===current)controller=null;
   }
  }
  refreshRef.current=load;
  void load();
  const timer=setInterval(()=>void load(),30000);
  const visibility=()=>{if(document.visibilityState==='visible')void load();else controller?.abort();};
  document.addEventListener('visibilitychange',visibility);
  return()=>{stopped=true;controller?.abort();clearInterval(timer);refreshRef.current=()=>{};document.removeEventListener('visibilitychange',visibility);};
 },[active,stationCode]);
 return {...(state.stationCode===stationCode?state:{data:null,error:null,loading:false,stationCode}),refresh};
}
