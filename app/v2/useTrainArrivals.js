'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
export default function useTrainArrivals(active) {
  const [state,setState]=useState({data:null,error:null,loading:false});
  const refreshRef=useRef(()=>{});
  const refresh=useCallback(()=>refreshRef.current(true),[]);
  useEffect(()=>{
    if(!active)return;
    let stopped=false, controller=null, lastAttempt=0;
    async function load(manual=false) {
      if(stopped || document.visibilityState!=='visible' || controller || (manual&&Date.now()-lastAttempt<3000))return;
      lastAttempt=Date.now();const current=new AbortController();controller=current;
      setState(previous=>({...previous,loading:true}));
      try {
        const response=await fetch('/api/train-arrivals',{cache:'no-store',signal:current.signal});
        const data=await response.json();
        if(!response.ok)throw new Error(data.code||'ARRIVAL_ERROR');
        if(!Array.isArray(data.groups)||!data.fetchedAt)throw new Error('ARRIVAL_FORMAT');
        if(!stopped && !current.signal.aborted)setState({data,error:null,loading:false});
      }catch(error){if(!stopped&&!current.signal.aborted)setState(previous=>({...previous,error:error.message,loading:false}));}
      finally{if(controller===current)controller=null;}
    }
    refreshRef.current=load;
    const visibility=()=>{if(document.visibilityState==='visible')void load();else if(controller){controller.abort();controller=null;}};
    void load();const timer=setInterval(()=>void load(),30000);
    document.addEventListener('visibilitychange',visibility);
    return()=>{stopped=true;controller?.abort();refreshRef.current=()=>{};clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
  },[active]);
  return {...state,refresh};
}
