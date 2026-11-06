'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { stationMaster, searchStationMaster } from '../lib/station-master';

const fonts = '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif';
const C = {bg:'#f0f3f7',ink:'#1d334b',muted:'#698096',line:'#e2e9ef',blue:'#245b96',green:'#1c8064'};
const css = {
  page:{minHeight:'100dvh',background:C.bg,color:C.ink,fontFamily:fonts,padding:'14px 12px 40px'},
  wrap:{maxWidth:620,margin:'0 auto'},
  card:{background:'#fff',border:'1px solid '+C.line,borderRadius:18,padding:17,marginBottom:12,boxShadow:'0 2px 10px #17304d06'},
  subtle:{fontSize:12,color:C.muted,lineHeight:1.6},
  button:{border:'1px solid #d7e3ec',background:'#fff',color:'#34556e',borderRadius:11,minHeight:39,padding:'8px 12px',fontSize:13,cursor:'pointer'},
  chip:{display:'inline-grid',placeItems:'center',color:'white',borderRadius:'50%',width:25,height:25,fontSize:12,fontWeight:800,flexShrink:0},
  field:{width:'100%',border:'1px solid #d3e0e9',borderRadius:10,padding:'11px 12px',fontSize:14,color:C.ink,background:'#fff'},
  train:{padding:'12px 13px',border:'1px solid #e5ebf0',borderRadius:12,background:'#fcfdfd',marginTop:9},
  mono:{fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',fontSize:11},
};
const fields=['subwayId','statnNm','updnLine','btrainNo','ordkey','arvlCd','arvlMsg2','arvlMsg3','recptnDt','barvlDt','trainLineNm'];
function cell(v){return v===undefined||v===null?'(없음)':String(v);}
function displayName(station){return station?.names?.ko||'역 선택';}
function rawField(value){return value===null||value===undefined?'—':String(value);}
function TrainRow({row}) {
  return <div style={css.train}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start'}}>
      <div style={{minWidth:0}}><strong style={{fontSize:14}}>{rawField(row.trainLineNm)}</strong><div style={{...css.subtle,marginTop:3}}>열차 {rawField(row.btrainNo)} · ordkey <code style={css.mono}>{rawField(row.ordkey)}</code></div></div>
      <span style={{fontSize:10,borderRadius:7,background:'#eaf2fa',padding:'5px 7px',whiteSpace:'nowrap'}}>상태 {rawField(row.arvlCd)}</span>
    </div>
    <div style={{fontSize:17,fontWeight:800,color:'#17694e',marginTop:10,overflowWrap:'anywhere'}}>{rawField(row.arvlMsg2)}</div>
    <div style={{fontSize:13,color:'#586f81',marginTop:5,overflowWrap:'anywhere'}}>arvlMsg3 · {rawField(row.arvlMsg3)}</div>
    <div style={{...css.subtle,marginTop:8}}>recptnDt · {rawField(row.recptnDt)}　/　barvlDt · {rawField(row.barvlDt)}</div>
  </div>;
}
export default function ArrivalTestPage(){
  const [stationCode,setStationCode]=useState('2816');
  const [picker,setPicker]=useState(false);
  const [line,setLine]=useState('8');
  const [query,setQuery]=useState('');
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [showRaw,setShowRaw]=useState(false);
  const sequence=useRef(0);
  const station=stationMaster.find(s=>s.stationCode===stationCode);
  const lines=useMemo(()=>[...new Set(stationMaster.map(s=>s.line))].sort((a,b)=>Number(a)-Number(b)),[]);
  const choices=useMemo(()=>searchStationMaster(query,line),[query,line]);
  useEffect(()=>{const params=new URLSearchParams(window.location.search);const s=stationMaster.find(x=>x.stationCode===params.get('station'));if(s){setStationCode(s.stationCode);setLine(s.line);}},[]);
  useEffect(()=>{
    const id=++sequence.current;
    const controller=new AbortController();
    async function refresh(){
      setLoading(true);setError('');
      try{
        const res=await fetch('/api/arrival-test?station='+encodeURIComponent(stationCode)+'&t='+Date.now(),{cache:'no-store',signal:controller.signal});
        const payload=await res.json();
        if(!res.ok)throw new Error(payload.error||'HTTP '+res.status);
        if(id===sequence.current)setData(payload);
      }catch(e){if(!controller.signal.aborted&&id===sequence.current)setError(String(e.message||e));}
      finally{if(id===sequence.current)setLoading(false);}
    }
    refresh();
    const timer=setInterval(refresh,30000);
    return()=>{clearInterval(timer);controller.abort();};
  },[stationCode]);
  function choose(s){setStationCode(s.stationCode);setLine(s.line);setPicker(false);setData(null);setShowRaw(false);const u=new URL(window.location.href);u.searchParams.set('station',s.stationCode);window.history.replaceState(null,'',u.pathname+u.search);}
  function manualRefresh(){setStationCode(code=>{const u=new URL(window.location.href);u.searchParams.set('station',code);return code;});window.dispatchEvent(new Event('arrival-test-refresh'));}
  const all=Array.isArray(data?.raw?.realtimeArrivalList)?data.raw.realtimeArrivalList:[];
  const matching=all.filter(row=>String(row.subwayId)===String(station?.subwayId));
  const directions=[...new Set([...matching.map(row=>row.updnLine),...(['상행','하행'])])].filter(Boolean);
  const responseCode=data?.raw?.errorMessage?.code||data?.raw?.RESULT?.CODE||'—';
  return <main style={css.page}><div style={css.wrap}>
    <header style={{...css.card,padding:'15px 16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}>
        <div><div style={{fontSize:10,fontWeight:750,letterSpacing:1.4,color:C.green}}>SUBWAY AI GUIDE · TEST</div><h1 style={{fontSize:21,letterSpacing:'-.6px',margin:'5px 0 0'}}>실시간 열차 도착정보</h1></div>
        <div style={{fontSize:11,padding:'6px 9px',borderRadius:20,color:C.green,background:'#e5f3ed',fontWeight:700}}>원본 테스트</div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16,gap:10,flexWrap:'wrap'}}>
        <button style={{...css.button,display:'flex',alignItems:'center',gap:8,border:0,padding:'4px 2px',fontSize:16,fontWeight:800}} onClick={()=>{setQuery('');setLine(station?.line||'');setPicker(true);}}><span style={{...css.chip,background:station?.color||'#245b96'}}>{station?.line||'?'}</span>{displayName(station)} <span style={{color:C.muted,fontSize:13}}>⌄</span></button>
        <button style={{...css.button,background:'#eaf3ee',color:'#23654c',fontWeight:700}} onClick={()=>window.location.reload()}>↻ 원본 다시 조회</button>
      </div>
      <div style={{...css.subtle,marginTop:8}}>30초마다 재호출 · 시간 계산 없음 · 캐시 없음 · 시간기준 제외 없음</div>
    </header>

    {picker&&<div role="presentation" onClick={()=>setPicker(false)} style={{position:'fixed',inset:0,zIndex:20,background:'#14283c70',display:'flex',alignItems:'center',justifyContent:'center',padding:12}}>
      <section role="dialog" aria-modal="true" aria-label="역 선택" onClick={e=>e.stopPropagation()} style={{background:'#fff',width:'100%',maxWidth:510,maxHeight:'86dvh',display:'flex',flexDirection:'column',borderRadius:17,padding:16,gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong style={{fontSize:18}}>기준역 선택</strong><button aria-label="닫기" style={css.button} onClick={()=>setPicker(false)}>✕</button></div>
        <input autoFocus style={css.field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="역명 · 역코드 검색"/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button style={{...css.button,background:line===''?'#eaf4f1':'#fff'}} onClick={()=>setLine('')}>전체</button>
          {lines.map(l=><button key={l} onClick={()=>setLine(l)} style={{...css.button,background:line===l?'#eaf4f1':'#fff',padding:'5px 8px',minHeight:32,borderColor:line===l?'#529985':C.line}}>{l}호선</button>)}
        </div>
        <div style={{overflowY:'auto',minHeight:100}}>
          {choices.map(s=><button key={s.stationCode} onClick={()=>choose(s)} style={{...css.button,width:'100%',textAlign:'left',display:'flex',alignItems:'center',gap:9,margin:'0 0 6px',background:s.stationCode===stationCode?'#eaf4ef':'#fff'}}>
            <span style={{...css.chip,background:s.color,width:22,height:22,fontSize:10}}>{s.line}</span><strong style={{flex:1}}>{displayName(s)}</strong><span style={css.subtle}>{s.stationCode}</span></button>)}
          {!choices.length&&<p style={css.subtle}>검색 결과가 없습니다.</p>}
        </div>
      </section>
    </div>}

    <section style={css.card}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}><strong>서울시 원본 응답</strong><span style={{fontSize:11,color:loading?'#9d6b2d':C.green}}>{loading?'조회 중':'응답 표시'}</span></div>
      {error&&<p role="alert" style={{fontSize:13,color:'#bd2930'}}>조회 오류: {error}</p>}
      {data&&<div style={{...css.subtle,marginTop:8}}>요청 역명: {data.requestedStationName} · 응답코드: {responseCode}<div>API 전체 {all.length}행 / 선택 호선 {matching.length}행</div><div>조회 시각: {new Date(data.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})}</div></div>}
      {!data&&!error&&<p style={css.subtle}>서울시 원본 조회 중…</p>}
    </section>

    {data&&<section style={css.card}>
      <h2 style={{fontSize:17,margin:'0 0 5px'}}>방향별 1·2순위 원본 메시지</h2>
      <p style={{...css.subtle,margin:'0 0 15px'}}>같은 순위 원본이 여러 건이면 모두 표시. 시간·상태로 제외하지 않음.</p>
      {directions.map(dir=><div key={dir} style={{marginBottom:24}}>
        <h3 style={{fontSize:15,margin:'0 0 10px',paddingBottom:7,borderBottom:'1px solid '+C.line}}>{dir}</h3>
        {[1,2].map(rank=>{
          const rows=matching.filter(r=>r.updnLine===dir&&String(r.ordkey||'')[1]===String(rank));
          return <div key={rank} style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:C.muted}}>{rank}번째 열차 · 원본 {rows.length}행</div>
            {rows.length?rows.map((r,j)=><TrainRow row={r} key={j}/>):<p style={{...css.subtle,background:'#f5f8fa',padding:'12px',borderRadius:10}}>해당 순위의 원본 데이터 없음</p>}
          </div>;
        })}
      </div>)}
    </section>}

    {data&&<section style={css.card}>
      <button style={{...css.button,width:'100%',textAlign:'left',display:'flex',justifyContent:'space-between',fontWeight:700}} aria-expanded={showRaw} onClick={()=>setShowRaw(v=>!v)}>필터링 전 원본 전체 확인 <span>{showRaw?'접기 ↑':'펼치기 ↓'}</span></button>
      {showRaw&&<><p style={css.subtle}>전체 응답을 어떠한 시간·상태 판단 없이 표시합니다. 다른 호선 응답도 포함됩니다.</p>
        {all.map((r,i)=><div key={i} style={{borderBottom:'1px solid '+C.line,padding:'10px 0',fontSize:12}}>
          <strong>원본 행 {i+1}</strong><div style={{display:'grid',gridTemplateColumns:'110px minmax(0,1fr)',gap:'4px 8px',marginTop:7}}>{fields.map(f=><div key={f} style={{display:'contents'}}><span style={{color:C.muted,...css.mono}}>{f}</span><span style={{overflowWrap:'anywhere'}}>{cell(r[f])}</span></div>)}</div>
        </div>)}
        <details style={{marginTop:14}}><summary style={{fontSize:12,cursor:'pointer'}}>원본 JSON 전체</summary><pre style={{fontSize:10,whiteSpace:'pre-wrap',overflowWrap:'anywhere',background:'#f1f5f8',padding:10,borderRadius:10}}>{JSON.stringify(data.raw,null,2)}</pre></details>
      </>}
    </section>}
    <p style={{...css.subtle,textAlign:'center',padding:'0 8px'}}>테스트 전용 · 기존 V2 실시간 도착화면과 API 처리 로직은 변경하지 않았습니다.</p>
  </div></main>;
}
