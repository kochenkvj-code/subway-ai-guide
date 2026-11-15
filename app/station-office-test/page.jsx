'use client';
import {useEffect,useMemo,useState} from 'react';

const samples=['0154','0200','2519','0234','0211','0249','0159','2637','0409','0426','0427'];
const formatPhone=x=>{const s=String(x||'').replace(/[^0-9]/g,'');return s.startsWith('02')&&s.length===10?'02-'+s.slice(2,6)+'-'+s.slice(6):s||'미제공';};
const statusLabel={direct:'역코드 일치',sharedCandidate:'다른 호선에만 자료',missing:'자료 없음'};
const statusHint={direct:'역코드로 정확히 조회된 고객안전실 기록',sharedCandidate:'역명은 같지만 역코드가 다릅니다. 동일 고객안전실인지 확인해야 합니다.',missing:'API 전체 응답에서 해당 역코드와 동일 역명 기록을 찾지 못했습니다.'};
const button={border:'1px solid #d7e1e9',background:'white',color:'#304f60',borderRadius:10,padding:'8px 12px',fontSize:12,fontWeight:700,cursor:'pointer'};
export default function StationOfficeTest(){
 const [payload,setPayload]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[selected,setSelected]=useState('0154');
 useEffect(()=>{let canceled=false;async function load(){try{const response=await fetch('/api/v2/station-office-test',{cache:'no-store'});const body=await response.json();if(!response.ok||!body.ok)throw Error(body.error||'조회 실패');if(!canceled)setPayload(body);}catch(e){if(!canceled)setError(e.message);}finally{if(!canceled)setBusy(false);}}load();return()=>{canceled=true;};},[]);
 const rows=payload?.rows||[];
 const visible=useMemo(()=>rows.filter(r=>(filter==='all'||r.status===filter)&&(!query||[r.stationCode,r.name,r.line+'호선'].some(v=>String(v).toLowerCase().includes(query.trim().toLowerCase())))),[rows,filter,query]);
 const selection=rows.find(r=>r.stationCode===selected)||rows[0]||null;
 const displayed=selection?.offices?.length?selection.offices:selection?.otherLineOffices||[];
 const stats=payload?.stats;
 const tone=x=>({direct:'#0b815a',sharedCandidate:'#ad711e',missing:'#9b4a4a'})[x]||'#536779';
 const label={display:'block',fontSize:11,color:'#7a8c99',marginBottom:5};
 return <main style={{minHeight:'100dvh',background:'#f2f5f8',color:'#21394a',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif',padding:'20px 12px 48px'}}>
  <div style={{maxWidth:850,margin:'0 auto'}}>
   <div style={{fontSize:11,fontWeight:800,color:'#317c76',letterSpacing:1.8,margin:'12px 0 7px'}}>STATION OFFICE · API AUDIT</div>
   <h1 style={{fontSize:26,letterSpacing:'-1px',margin:'0 0 6px'}}>고객안전실 데이터 조회 테스트</h1>
   <p style={{color:'#667d8e',fontSize:13,lineHeight:1.6,margin:'0 0 20px'}}>서울교통공사 기준역 289개 + 까치산 2호선(0200)의 전용 API 데이터 보유 여부를 검증합니다. 테스트 페이지이며 운영 시설 메뉴에는 아직 반영하지 않았습니다.</p>
   {busy&&<div style={{padding:28,background:'#fff',borderRadius:14}}>전체 고객안전실 데이터 조회 및 역코드 대조 중…</div>}
   {error&&<div role="alert" style={{background:'#fff3f1',color:'#a13831',padding:16,borderRadius:12}}>조회 실패: {error==='NOT_CONFIGURED'?'Production 환경변수가 설정되지 않았습니다.':error==='UPSTREAM_UNAVAILABLE'?'원천 API 연결 또는 인증에 실패했습니다. 키 발급기관·허용 API를 확인해 주세요.':error}</div>}
   {stats&&<>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:9,marginBottom:15}}>
     {[['비교 대상',stats.target],['역코드 정확 일치',stats.direct],['다른 호선 기록만 있음',stats.sharedCandidate],['원천 자료 없음',stats.missing]].map(([name,count])=><div key={name} style={{background:'white',padding:'15px 16px',border:'1px solid #e2eaf0',borderRadius:13}}><div style={{fontSize:11,color:'#7d909d'}}>{name}</div><div style={{fontSize:27,fontWeight:850,marginTop:5}}>{count}<span style={{fontSize:11,fontWeight:500,color:'#90a0ac',marginLeft:3}}>개</span></div></div>)}
    </div>
    <div style={{padding:'13px 15px',borderRadius:12,background:'#e8f0f3',color:'#496776',fontSize:12,lineHeight:1.7,marginBottom:22}}>출처: {payload.provider} · 원천 반환 {stats.sourceCount}건 / 원천 총건수 {stats.sourceReportedTotal}건 · 대조 대상 {stats.baseMaster}+1개. {stats.sourceIncomplete&&<strong>원천 전체 페이지 수집이 완료되지 않았을 수 있습니다.</strong>}<div style={{fontSize:10,color:'#718996'}}>데이터 조회: {new Date(payload.fetchedAt).toLocaleString('ko-KR')}</div></div>
    <section style={{background:'white',border:'1px solid #e0e8ee',padding:17,borderRadius:16,marginBottom:16}}>
     <div style={{fontSize:16,fontWeight:800,marginBottom:11}}>역별 상세 데이터</div>
     <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>{samples.map(code=>{const s=rows.find(x=>x.stationCode===code);return s?<button key={code} style={{...button,background:code===selected?'#174f64':'#fff',color:code===selected?'#fff':'#3b5a6a'}} onClick={()=>setSelected(code)}>{s.line} {s.name}</button>:null;})}</div>
     <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
      <label style={{flex:'1 1 230px',fontSize:12}}>역을 선택하세요
       <select value={selection?.stationCode||''} onChange={e=>setSelected(e.target.value)} style={{display:'block',width:'100%',marginTop:5,padding:10,border:'1px solid #dce5ec',borderRadius:9,fontSize:14}}>{rows.map(r=><option key={r.stationCode} value={r.stationCode}>{r.line}호선 {r.name} ({r.stationCode})</option>)}</select>
      </label>
     </div>
     {selection&&<div style={{background:'#f6f8fa',borderRadius:12,padding:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:6}}><strong>{selection.line}호선 {selection.name} <small style={{fontWeight:500,color:'#81939d'}}>#{selection.stationCode}</small></strong><span style={{color:tone(selection.status),fontSize:11,fontWeight:800}}>{statusLabel[selection.status]}</span></div>
      <p style={{fontSize:11,color:'#6f818e',margin:'0 0 12px',lineHeight:1.6}}>{statusHint[selection.status]}</p>
      {displayed.length===0?<div style={{background:'white',padding:13,borderRadius:9,color:'#687e8c',fontSize:12}}>해당 역의 고객안전실 API 기록을 확인할 수 없습니다.</div>:displayed.map((r,i)=><div key={i} style={{background:'white',border:'1px solid #e5ebef',padding:13,borderRadius:10,marginBottom:8}}>
       {selection.status==='sharedCandidate'&&<div style={{fontSize:11,fontWeight:800,color:'#ad711e',marginBottom:8}}>다른 호선 자료: {r.lineNm} / {r.stnCd} — 공용 관리 여부 확인 필요</div>}
       <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'12px 9px'}}>
       {[[ '고객안전실 위치',r.dtlPstn],[ '층수',r.stnFlr],[ '가까운 출입구',r.vcntEntrcNo==='-'?'미기재':r.vcntEntrcNo],[ '전화번호',formatPhone(r.operInstTelno)],[ '이용 가능 시간',r.utztnPsbltyHr||'미제공'],[ '데이터 기준일',r.crtrYmd],[ '원천 역코드',r.stnCd],[ '시설명',r.fcltNm]].map(([key,val])=><div key={key}><small style={label}>{key}</small><strong style={{fontSize:12,overflowWrap:'anywhere'}}>{val||'미기재'}</strong></div>)}
       </div>
      </div>)}
     </div>}
    </section>
    <section style={{background:'white',border:'1px solid #e0e8ee',padding:17,borderRadius:16}}>
     <strong style={{fontSize:16}}>전체 {stats.target}개 기준역 데이터 대조</strong>
     <p style={{fontSize:11,color:'#778b99',lineHeight:1.5}}>역코드 미일치는 공용 고객안전실의 증거가 아니므로 별도 상태로 표시합니다.</p>
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="역명 · 역코드 · 호선 검색" style={{width:'100%',boxSizing:'border-box',padding:12,background:'#f8fafb',border:'1px solid #dbe5eb',borderRadius:10,fontSize:13,marginBottom:10}}/>
     <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>{[['all','전체'],['direct','직접 조회'],['sharedCandidate','다른 호선'],['missing','미조회']].map(([k,s])=><button key={k} onClick={()=>setFilter(k)} style={{...button,background:filter===k?'#174f64':'#fff',color:filter===k?'white':'#426477'}}>{s}</button>)}</div>
     <div style={{maxHeight:420,overflowY:'auto',border:'1px solid #e5edf2',borderRadius:10}}>{visible.map(r=><button key={r.stationCode} onClick={()=>{setSelected(r.stationCode);window.scrollTo({top:0,behavior:'smooth'});}} style={{width:'100%',border:'none',borderBottom:'1px solid #edf1f4',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,textAlign:'left',padding:'11px 12px',background:r.stationCode===selected?'#edf6f8':'white',cursor:'pointer'}}><span style={{fontSize:12,color:'#244356'}}><b>{r.line}호선</b> {r.name} <small style={{color:'#8197a5'}}>#{r.stationCode}</small></span><small style={{fontWeight:700,color:tone(r.status),whiteSpace:'nowrap'}}>{statusLabel[r.status]}</small></button>)}{visible.length===0&&<p style={{padding:16,color:'#7c909f'}}>일치하는 역이 없습니다.</p>}</div>
    </section>
   </>}
   <div style={{textAlign:'center',fontSize:11,color:'#9aacb8',marginTop:22}}>읽기 전용 테스트 · 운영 메뉴/기준역 마스터 미변경</div>
  </div>
 </main>;
}
