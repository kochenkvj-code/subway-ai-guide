"use client";
import { useEffect, useMemo, useState } from "react";

const KST = "Asia/Seoul";
const dateKst = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const today = () => dateKst(Date.now());
const startOf = (date, days) => { const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0,10); };
const names = {route:"길찾기",gate:"게이트 오류",fares:"승차권·교통카드",facility:"시설안내",exchange:"환전소",nearby:"출구·관광지",staff:"고객안전실"};
const langs = {ko:"한국어",en:"영어",ja:"일본어",zh:"중국어"};
const card = {background:"#fff",border:"1px solid #dce5e9",borderRadius:14,padding:18};
export default function StatsPage() {
  const [auth,setAuth] = useState(null),[password,setPassword] = useState(""),[error,setError] = useState("");
  const [period,setPeriod] = useState("day"),[date,setDate] = useState(today),[rows,setRows] = useState([]),[busy,setBusy] = useState(false);
  useEffect(() => { fetch("/api/stats/auth",{cache:"no-store"}).then(r=>r.json()).then(v=>setAuth(!!v.authenticated)).catch(()=>setAuth(false)); },[]);
  const start = period==="day"?date:startOf(date,period==="week"?6:29);
  useEffect(() => {
    if (!auth) return;
    let active=true;
    setBusy(true);setError("");
    fetch("/api/stats/report?"+new URLSearchParams({start,end:date}),{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("통계 조회에 실패했습니다.");return r.json();}).then(v=>{if(active)setRows(v.rows||[]);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[auth,start,date]);
  const stats=useMemo(()=>{
    const counts={},languages={},hours={},dates={};let visits=0,questions=0,routes=0,feedback=0,solved=0;
    for(const r of rows){const d=dateKst(r.created_at);const h=new Intl.DateTimeFormat("en-GB",{timeZone:KST,hour:"2-digit",hourCycle:"h23"}).format(new Date(r.created_at));dates[d]=(dates[d]||0)+1;hours[h]=(hours[h]||0)+1;
      if(r.event_type==="page_view")visits++;
      if(r.event_type==="ai_question")questions++;
      if(r.event_type==="route_search"&&r.event_name==="request")routes++;
      if(r.event_type==="quick_menu")counts[r.event_name]=(counts[r.event_name]||0)+1;
      if(r.event_type==="feedback"){feedback++;if(r.event_name==="solved")solved++;}
      if(r.event_type==="page_view"||r.event_type==="quick_menu"||r.event_type==="ai_question")languages[r.language]=(languages[r.language]||0)+1;
    }
    return {visits,questions,routes,counts,languages,hours,dates,feedback,solved};
  },[rows]);
  const chart=(data,labels)=>{const entries=Object.entries(data).sort((a,b)=>labels?b[1]-a[1]:a[0].localeCompare(b[0]));const max=Math.max(1,...entries.map(x=>x[1]));return entries.length?<div style={{display:"grid",gap:10}}>{entries.map(([key,value])=><div key={key} style={{display:"grid",gridTemplateColumns:"110px 1fr 42px",alignItems:"center",gap:10,fontSize:13}}><span>{labels?.[key]||key}</span><div style={{height:12,borderRadius:8,background:"#edf4f3",overflow:"hidden"}}><div style={{height:"100%",width:(value/max*100)+"%",background:"#16836e",borderRadius:8}}/></div><strong style={{textAlign:"right"}}>{value}</strong></div>)}</div>:<p style={{color:"#7a858d"}}>해당 기간 기록이 없습니다.</p>;};
  const login=async(e)=>{e.preventDefault();setError("");try{const r=await fetch("/api/stats/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});const j=await r.json();if(!r.ok)throw Error(j.error||"로그인 실패");setPassword("");setAuth(true);}catch(e){setError(e.message);}};
  const logout=async()=>{await fetch("/api/stats/auth",{method:"DELETE"});setAuth(false);setRows([]);};
  return <main style={{minHeight:"100dvh",background:"#f5f8f8",color:"#19323a",fontFamily:"system-ui,sans-serif",padding:"24px 14px"}}>
    <div style={{maxWidth:960,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,gap:12}}><div><h1 style={{fontSize:22,margin:0}}>종로5가역 AI 안내 통계</h1><p style={{color:"#667b83",fontSize:13,margin:"6px 0 0"}}>관리자 전용 · 한국시간(KST) 기준</p></div>{auth&&<button onClick={logout} style={{border:"1px solid #ccd9da",background:"#fff",borderRadius:9,padding:10,cursor:"pointer"}}>로그아웃</button>}</header>
      {auth===null?<p>인증 확인 중…</p>:!auth?<form onSubmit={login} style={{...card,maxWidth:420,margin:"60px auto"}}><h2 style={{marginTop:0,fontSize:18}}>관리자 로그인</h2><label htmlFor="stats-password">관리자 비밀번호</label><input id="stats-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",padding:12,border:"1px solid #b9c9cc",borderRadius:9,margin:"10px 0 16px"}}/><button type="submit" style={{background:"#087f69",color:"white",border:0,borderRadius:9,padding:"11px 20px",cursor:"pointer"}}>로그인</button>{error&&<p role="alert" style={{color:"#ba3333"}}>{error}</p>}</form>:<>
        <section style={{...card,display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,marginBottom:14}}><label>조회 기준 <select value={period} onChange={e=>setPeriod(e.target.value)} style={{marginLeft:8,padding:9,borderRadius:8,border:"1px solid #c8d7d9"}}><option value="day">일별</option><option value="week">최근 7일</option><option value="month">최근 30일</option></select></label><label>기준 날짜 <input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)} style={{marginLeft:8,padding:9,borderRadius:8,border:"1px solid #c8d7d9"}}/></label><span style={{fontSize:12,color:"#667b83"}}>{start} ~ {date}</span></section>
        {error&&<p role="alert" style={{color:"#ba3333"}}>{error}</p>}{busy&&<p>통계 불러오는 중…</p>}
        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:14}}>{[["접속 횟수",stats.visits],["빠른 안내",Object.values(stats.counts).reduce((a,b)=>a+b,0)],["AI 질문",stats.questions],["길찾기 검색",stats.routes]].map(([label,n])=><div key={label} style={card}><div style={{fontSize:12,color:"#647a82"}}>{label}</div><strong style={{display:"block",fontSize:28,marginTop:7}}>{n.toLocaleString()}</strong></div>)}</section>
        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14}}>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>날짜별 이벤트 추이</h2>{chart(stats.dates)}</div>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>빠른 안내 메뉴별 이용량</h2>{chart(stats.counts,names)}</div>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>언어별 이용 이벤트</h2>{chart(stats.languages,langs)}</div>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>시간대별 이벤트 (KST)</h2>{chart(stats.hours)}</div>
        </section>
        <p style={{color:"#687c82",fontSize:12,lineHeight:1.7}}>접속 횟수는 페이지 로드 기준이며 순 방문자 수가 아닙니다. 날짜·시간 차트는 수집된 전체 이벤트 수입니다. 실제 문의 감소나 해결률을 의미하지 않습니다. 통계는 수집 기능 배포 이후부터 기록됩니다.</p>
      </>}
    </div>
  </main>;
}
