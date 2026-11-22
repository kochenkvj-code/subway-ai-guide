'use client';
import {useEffect,useState} from 'react';
const days=['평일','주말','공휴일','상시'];
const s={shell:{maxWidth:1050,margin:'0 auto',padding:'26px 14px 72px',fontFamily:'system-ui,sans-serif',color:'#213a32'},
  card:{background:'#fff',border:'1px solid #d9e5dd',borderRadius:14,padding:14,marginTop:14},
  grid:{display:'flex',flexWrap:'wrap',gap:10,alignItems:'end'},
  control:{padding:'10px 12px',border:'1px solid #bdcec4',borderRadius:8,fontSize:16,background:'#fff',color:'#214b3e'},
  td:{padding:'8px 7px',borderBottom:'1px solid #edf1ee',whiteSpace:'nowrap',fontSize:12},
  th:{padding:'9px 7px',textAlign:'left',borderBottom:'2px solid #d4e3d9',whiteSpace:'nowrap',fontSize:12,background:'#f4f8f5'}};
const ttime=t=>String(t||'').slice(0,5);
export default function TimetableAudit(){
 const [day,setDay]=useState('주말'),[hour,setHour]=useState('13'),[temp,setTemp]=useState('N'),[report,setReport]=useState(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[nonce,setNonce]=useState(0);
 useEffect(()=>{
  const ac=new AbortController();setLoading(true);setError('');
  fetch('/api/v2/timetable-audit?'+new URLSearchParams({day,hour,temp}),{cache:'no-store',signal:ac.signal})
    .then(async r=>{const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'조회 실패');setReport(j);})
    .catch(e=>{if(!ac.signal.aborted){setReport(null);setError(e.message);}})
    .finally(()=>{if(!ac.signal.aborted)setLoading(false);});
  return()=>ac.abort();
 },[day,hour,temp,nonce]);
 return <main style={{minHeight:'100vh',background:'#f4f7f5'}}>
  <meta name="robots" content="noindex,nofollow"/>
  <div style={s.shell}>
   <div style={{fontSize:12,color:'#4e7969',fontWeight:700}}>SUBWAY AI GUIDE · TIME TABLE AUDIT</div>
   <h1 style={{fontSize:24,margin:'8px 0 6px'}}>종로5가역 1호선 · 시간표 누락 진단</h1>
   <p style={{fontSize:13,lineHeight:1.6,color:'#5e7469'}}>운영 중인 시간표는 변경하지 않고, 저장된 운영 API 키로 원본을 조회해 <strong>역번호 방식과 역명 방식</strong>을 비교합니다. 이 페이지는 임시 진단용이며 외부에 링크를 배포하지 마세요.</p>
   <div style={s.card}><div style={s.grid}>
    <label>운행일 구분<br/><select style={s.control} value={day} onChange={e=>setDay(e.target.value)}>{days.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>시간대<br/><select style={s.control} value={hour} onChange={e=>setHour(e.target.value)}>{Array.from({length:21},(_,i)=>i+5).map(h=><option key={h} value={h}>{String(h%24).padStart(2,'0')}:00{h>=24?' (익일)':''}</option>)}</select></label>
    <label>임시 시간표 구분<br/><select style={s.control} value={temp} onChange={e=>setTemp(e.target.value)}><option value="N">N · 일반</option><option value="Y">Y · 임시</option><option value="none">파라미터 제외</option></select></label>
    <button style={{...s.control,background:'#23634c',color:'#fff'}} disabled={loading} onClick={()=>setNonce(x=>x+1)}>{loading?'조회 중':'다시 조회'}</button>
   </div>
   <p style={{fontSize:12,color:'#668074',marginBottom:0}}>원본 조회값: lineNm=1호선 · upbdnbSe=상행/하행 · wkndSe=선택값 · tmprTmtblYn=선택값 · 최대 1,000건씩 페이지 반복</p>
   </div>
   {error&&<div style={{...s.card,color:'#b32929'}}>조회 오류: {error}</div>}
   {report&&<><p style={{fontSize:12,color:'#73857b',marginTop:18}}>조회 {new Date(report.checkedAt).toLocaleString('ko-KR')} · 영업일 {report.businessDate} · 원본 API: getTrainSch</p>
    {report.sources.map(src=><section style={s.card} key={src.kind}>
     <h2 style={{margin:'2px 0 8px',fontSize:20}}>{src.kind==='code'?'① 역번호 방식 (현재 관리자 방식)':'② 역명 방식 (일반 사용자 방식)'}</h2>
     <p style={{fontSize:13,margin:'0 0 10px'}}><code>{src.kind==='code'?'stnCd=0154':'stnNm=종로5가'}</code></p>
     <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {[['원본 받은 행',src.counts.raw],['역 식별 통과',src.counts.matched],['중복 정리',src.counts.unique],['최종 시간표',src.counts.compiled],['선택 시간대 표시',src.counts.hourShown]].map(([label,val])=><div style={{background:'#edf5ef',padding:'8px 12px',borderRadius:9,minWidth:95}} key={label}><div style={{fontSize:11,color:'#527b67'}}>{label}</div><strong style={{fontSize:20}}>{val}</strong></div>)}
     </div>
     <h3 style={{fontSize:14,marginTop:18}}>방향별 원본 API 응답</h3>
     <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
      <thead><tr>{['방향','응답','API totalCount','받은 행','역코드/역명 필터 통과','중복 정리'].map(x=><th key={x} style={s.th}>{x}</th>)}</tr></thead>
      <tbody>{src.groups.map(g=><tr key={g.direction}><td style={s.td}>{g.direction}</td><td style={s.td}>{g.ok?'정상 ('+g.code+')':g.error}</td><td style={s.td}>{g.providerTotal??'—'}</td><td style={s.td}>{g.fetched??'—'}</td><td style={s.td}>{g.matched??'—'}</td><td style={s.td}>{g.unique??'—'}</td></tr>)}</tbody>
     </table></div>
     <h3 style={{fontSize:14,marginTop:18}}>관리자 후처리에서 제외된 행 (전체 시간표)</h3>
     <p style={{fontSize:12}}>역 식별 검증 통과 이후: 도착 전용 {src.excluded.arrivalOnly} · 유효기간 {src.excluded.expired} · 방면 분류 실패 {src.excluded.unclassified} · 중복 {src.excluded.duplicates} · 시각 오류 {src.excluded.invalidTime}</p>
     <h3 style={{fontSize:14,marginTop:18}}>{String(Number(hour)%24).padStart(2,'0')}시 관리자 표시 열차 ({src.shown.length}건)</h3>
     <p style={{fontSize:12,lineHeight:1.8}}>{src.shown.length?src.shown.map(r=>(ttime(r.time)+' '+r.to+' ['+r.column+']'+(r.express?' 급행':'')+' #'+r.number)).join(' / '):'없음'}</p>
     <details><summary style={{fontSize:14,fontWeight:700,cursor:'pointer'}}>원본 API의 해당 시간대 행과 누락 사유 ({src.counts.hourRaw}건)</summary>
      <div style={{overflowX:'auto',marginTop:10}}><table style={{width:'100%',borderCollapse:'collapse'}}>
       <thead><tr>{['출발','열차번호','행선지','방향','응답 역번호','응답 역명','분류'].map(x=><th key={x} style={s.th}>{x}</th>)}</tr></thead>
       <tbody>{src.rawAtHour.map((r,i)=><tr key={i} style={{background:r.status==='화면 표시'?'#f5fbf7':'#fff5ee'}}>
        {[ttime(r.time),r.number,r.to,r.sourceDirection,r.code,r.station,r.status].map((v,k)=><td key={k} style={s.td}>{v}</td>)}
       </tr>)}</tbody>
      </table></div>{src.rawAtHourTruncated&&<p>해당 시간대 원본 중 최대 220건만 표시합니다.</p>}
     </details>
    </section>)}
   </>}
   <p style={{fontSize:12,color:'#6c8175',marginTop:20}}>이 진단 페이지는 원본 공식 계획 시간표만 조회하며 실시간 열차 도착정보와 다를 수 있습니다. API 인증키는 화면과 응답에 포함되지 않습니다.</p>
  </div>
 </main>;
}
