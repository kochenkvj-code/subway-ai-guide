"use client";
import { useEffect, useMemo, useState } from "react";

const KST = "Asia/Seoul";
const dateKst = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const today = () => dateKst(Date.now());
const startOf = (date, days) => { const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0,10); };
const names = {route:"길찾기",gate:"게이트 오류",fares:"승차권·교통카드",facility:"시설안내",exchange:"환전소",nearby:"출구·관광지",staff:"고객안전실"};
const langs = {ko:"한국어",en:"영어",ja:"일본어",zh:"중국어"};
const eventLabels = {page_view:"접속",quick_menu:"빠른 안내",ai_question:"AI 질문",route_search:"길찾기",language_change:"언어 변경",feedback:"피드백"};
const countryLabels = {KR:"한국",JP:"일본",HK:"홍콩",SG:"싱가포르",US:"미국",CN:"중국",TW:"대만"};
const timeKst = (value) => new Intl.DateTimeFormat("ko-KR",{timeZone:KST,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(value));
const card = {background:"#fff",border:"1px solid #dce5e9",borderRadius:14,padding:18};
export default function StatsPage() {
  const [auth,setAuth] = useState(null),[password,setPassword] = useState(""),[error,setError] = useState("");
  const [rawPage,setRawPage] = useState(0);
  const [period,setPeriod] = useState("day"),[date,setDate] = useState(today),[rows,setRows] = useState([]),[busy,setBusy] = useState(false);
  useEffect(() => { fetch("/api/stats/auth",{cache:"no-store"}).then(r=>r.json()).then(v=>setAuth(!!v.authenticated)).catch(()=>setAuth(false)); },[]);
  const start = period==="day"?date:startOf(date,period==="week"?6:29);
  useEffect(() => {
    if (!auth) return;
    let active=true;
    setBusy(true);setError("");
    fetch("/api/stats/report?"+new URLSearchParams({start,end:date}),{cache:"no-store"}).then(async r=>{if(!r.ok){const v=await r.json().catch(()=>({}));throw Error(v.error||"통계 조회에 실패했습니다.");}return r.json();}).then(v=>{if(active)setRows(v.rows||[]);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[auth,start,date]);
  useEffect(()=>setRawPage(0),[start,date]);
  const sessionRows = useMemo(()=>{
    const groups = new Map();
    for (const event of rows) {
      // Legacy events have no session ID; never infer identity from country/device/time.
      const key = event.session_id || "legacy-" + event.id;
      if (!groups.has(key)) groups.set(key, {key,events:[]});
      groups.get(key).events.push(event);
    }
    return [...groups.values()].map(group=>{
      group.events.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
      group.first=group.events[0];
      group.last=group.events[group.events.length-1];
      return group;
    }).sort((a,b)=>new Date(b.last.created_at)-new Date(a.last.created_at));
  },[rows]);
  const pageSize = 50;
  const pageCount = Math.max(1,Math.ceil(sessionRows.length/pageSize));
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
        <section style={{...card,marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:12}}>
            <div><h2 style={{fontSize:16,margin:0}}>접속·이용 기록 (Raw Data)</h2><p style={{fontSize:12,color:"#687c82",margin:"5px 0 0"}}>조회 기간 내 {sessionRows.length.toLocaleString()}개 접속 기록 · 최근 활동순 · 50개씩 표시</p></div>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <button disabled={rawPage===0} onClick={()=>setRawPage(p=>Math.max(0,p-1))} style={{padding:"7px 12px",border:"1px solid #ccd9da",borderRadius:8,background:"#fff",cursor:"pointer"}}>이전</button>
              <span>{rawPage+1} / {pageCount}</span>
              <button disabled={rawPage>=pageCount-1} onClick={()=>setRawPage(p=>Math.min(pageCount-1,p+1))} style={{padding:"7px 12px",border:"1px solid #ccd9da",borderRadius:8,background:"#fff",cursor:"pointer"}}>다음</button>
            </div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,textAlign:"left"}}>
              <thead><tr>{["접속시간 (KST)","국가","기기 / 환경","활동 내역 (시간순)"].map(h=><th key={h} style={{padding:"10px 9px",borderBottom:"1px solid #dce5e9",color:"#61777f",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>{sessionRows.slice(rawPage*pageSize,(rawPage+1)*pageSize).map(group=>{
                const r=group.first;
                const seconds=Math.max(0,Math.round((new Date(group.last.created_at)-new Date(r.created_at))/1000));
                return <tr key={group.key}>
                  <td style={{padding:"12px 9px",borderBottom:"1px solid #edf1f2",whiteSpace:"nowrap",verticalAlign:"top"}}>{timeKst(r.created_at)}<div style={{color:"#819096",marginTop:4}}>{r.session_id?group.events.length+"개 활동 · "+seconds+"초":"이전 개별 기록"}</div></td>
                  <td style={{padding:"12px 9px",borderBottom:"1px solid #edf1f2",whiteSpace:"nowrap",verticalAlign:"top"}}>{countryLabels[r.country]||r.country||"미확인"}</td>
                  <td style={{padding:"12px 9px",borderBottom:"1px solid #edf1f2",whiteSpace:"nowrap",verticalAlign:"top"}}>{r.device_type||"미확인"}<div style={{color:"#819096",marginTop:4,whiteSpace:"nowrap"}}>{[r.os_type,r.browser].filter(Boolean).join(" · ")||"미확인"}</div></td>
                  <td style={{padding:"10px 9px",borderBottom:"1px solid #edf1f2",minWidth:260,verticalAlign:"top"}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{group.events.map((e,i)=>{
                      const action=e.event_type==="quick_menu"?(names[e.event_name]||e.event_name):e.event_type==="language_change"?"언어: "+(langs[e.event_name]||e.event_name):e.event_type==="route_search"?"길찾기: "+({request:"요청",success:"성공",failure:"실패"}[e.event_name]||e.event_name):e.event_type==="feedback"?"피드백: "+({solved:"해결됨",not_solved:"미해결"}[e.event_name]||e.event_name):eventLabels[e.event_type]||e.event_type;
                      return <span key={e.id||i} title={timeKst(e.created_at)+" · "+(langs[e.language]||e.language)} style={{display:"inline-block",background:"#eef5f3",color:"#285d52",borderRadius:6,padding:"5px 8px",whiteSpace:"nowrap"}}>{action}</span>;
                    })}</div>
                  </td>
                </tr>;
              })}</tbody>
            </table>
            {!sessionRows.length&&<p style={{color:"#7a858d",fontSize:13}}>해당 기간 기록이 없습니다.</p>}
          </div>
          <p style={{fontSize:12,color:"#687c82",lineHeight:1.6,marginBottom:0}}>국가는 접속 IP 기반 추정 국가이며 실제 국적이나 현재 위치를 보장하지 않습니다. IP 주소, 기기 고유식별자, 전체 User-Agent, 질문 내용은 저장하지 않습니다. 기록은 페이지를 새로 열 때 생성되는 임시 익명 세션별로 묶습니다. 과거 기록은 세션 ID가 없어 개별 표시됩니다. 이름·IP·기기 고유식별자는 저장하지 않습니다.</p>
        </section>
        <p style={{color:"#687c82",fontSize:12,lineHeight:1.7}}>접속 횟수는 페이지 로드 기준이며 순 방문자 수가 아닙니다. 날짜·시간 차트는 수집된 전체 이벤트 수입니다. 실제 문의 감소나 해결률을 의미하지 않습니다. 통계는 수집 기능 배포 이후부터 기록됩니다.</p>
      </>}
    </div>
  </main>;
}
