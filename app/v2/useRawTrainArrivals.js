'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
export default function useRawTrainArrivals(active,stationCode){
  const [state,setState]=useState({stationCode,data:null,error:null,loading:false});
  const loadRef=useRef(()=>{});
  const refresh=useCallback(()=>loadRef.current(),[]);
  useEffect(()=>{
    if(!active||!stationCode)return;
    let disposed=false;
    let current=null;
    setState({stationCode,data:null,error:null,loading:true});
    async function load(){
      if(disposed||document.visibilityState!=='visible'||current)return;
      const controller=new AbortController();current=controller;
      setState(prev=>({...prev,loading:true}));
      try{
        const response=await fetch('/api/v2/train-arrivals?station='+encodeURIComponent(stationCode),{cache:'no-store',signal:controller.signal});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'ARRIVAL_ERROR');
        if(data.station?.stationCode!==stationCode||!data.raw||typeof data.raw!=='object')throw new Error('ARRIVAL_FORMAT');
        if(!disposed&&!controller.signal.aborted)setState({stationCode,data,error:null,loading:false});
      }catch(error){
        if(!disposed&&!controller.signal.aborted)setState(prev=>({...prev,error:error.message||'ARRIVAL_ERROR',loading:false}));
      }finally{if(current===controller)current=null;}
    }
    loadRef.current=load;
    const onVisibility=()=>{if(document.visibilityState==='visible')void load();else current?.abort();};
    void load();
    const timer=setInterval(()=>void load(),30000);
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{disposed=true;current?.abort();loadRef.current=()=>{};clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);};
  },[active,stationCode]);
  return {...(state.stationCode===stationCode?state:{stationCode,data:null,error:null,loading:false}),refresh};
}
