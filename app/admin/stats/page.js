"use client";
import { useEffect, useMemo, useState } from "react";
import { ANALYTICS_EXCLUDED_KEY } from "../../lib/analytics-preference";
import { FACILITY_LABELS, isFacilityContext } from "../../lib/facility-stat";

const KST = "Asia/Seoul";
const dateKst = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const today = () => dateKst(Date.now());
const startOf = (date, days) => { const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0,10); };
const shiftDate = (date, delta) => { const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0,10); };
const changeDatePart = (date, part, value) => {
  const [y,m,d] = date.split("-").map(Number);
  const parts = {year:y,month:m,day:d};
  parts[part] = Number(value);
  const lastDay = new Date(Date.UTC(parts.year,parts.month,0)).getUTCDate();
  const result = [parts.year,String(parts.month).padStart(2,"0"),String(Math.min(parts.day,lastDay)).padStart(2,"0")].join("-");
  return result > today() ? today() : result;
};
const names = {route:"길찾기",gate:"게이트 오류",fares:"승차권·교통카드",facility:"시설안내",exchange:"환전소",nearby:"출구·관광지",staff:"고객안전실",live:"실시간 열차정보",tour:"관광지 안내"};
const langs = {ko:"한국어",en:"영어",ja:"일본어",zh:"중국어"};
const eventLabels = {page_view:"접속",quick_menu:"빠른 안내",ai_question:"AI 질문",route_search:"길찾기",language_change:"언어 변경",feedback:"피드백"};
const isFunctionalEvent = (e) => ["quick_menu","ai_question","route_search","feedback","gate_action"].includes(e.event_type);
const gateActions = {e01:"E-01 카드 중복",e03:"E-03 하차 처리 누락",e04:"E-04 승차 처리 누락",e05:"E-05 이용시간 초과",e06:"E-06 카드 사용 불가",e14:"E-14 잔액 부족",e33:"E-33 당역 재승차",e44:"E-44 당역 재하차",opposite:"반대편 승강장",unknown:"오류 코드 모름",another:"다른 오류 선택",office:"고객안전실 위치",details_open:"오류 상세 안내 보기"};
const eventTime = e => e.occurred_at || e.created_at;
const screenTime = ms => { if(ms == null)return "미측정"; const seconds=Math.floor(ms/1000); return seconds<1?"1초 미만":[seconds>=3600?Math.floor(seconds/3600)+"시간":"",seconds>=60?Math.floor(seconds%3600/60)+"분":"",seconds%60?seconds%60+"초":""].filter(Boolean).join(" "); };
const countryLabels = {KR:"한국",JP:"일본",HK:"홍콩",SG:"싱가포르",US:"미국",CN:"중국",TW:"대만"};
const timeKst = (value) => new Intl.DateTimeFormat("ko-KR",{timeZone:KST,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(value));
const card = {background:"#fff",border:"1px solid #dce5e9",borderRadius:14,padding:18};
export default function StatsPage() {
  const [auth,setAuth] = useState(null),[password,setPassword] = useState(""),[error,setError] = useState("");
  const [analyticsExcluded,setAnalyticsExcluded] = useState(null);
  const [preferenceError,setPreferenceError] = useState("");
  useEffect(() => {
    const sync=()=>{try{setAnalyticsExcluded(localStorage.getItem(ANALYTICS_EXCLUDED_KEY)==="1");setPreferenceError("");}catch{setPreferenceError("브라우저 설정 저장소에 접근할 수 없습니다.");}};
    sync();window.addEventListener("storage",sync);
    return ()=>window.removeEventListener("storage",sync);
  },[]);
  const toggleAnalyticsExcluded=()=>{
    if(!auth || analyticsExcluded===null)return;
    try{
      const next=!analyticsExcluded;
      if(next)localStorage.setItem(ANALYTICS_EXCLUDED_KEY,"1");else localStorage.removeItem(ANALYTICS_EXCLUDED_KEY);
      if((localStorage.getItem(ANALYTICS_EXCLUDED_KEY)==="1")!==next)throw Error("Storage unavailable");
      setAnalyticsExcluded(next);setPreferenceError("");
      window.dispatchEvent(new Event("analytics-preference-change"));
    }catch{setPreferenceError("설정을 저장하지 못했습니다. 브라우저의 사이트 데이터 저장 허용 여부를 확인해 주세요.");}
  };
  const [rawPage,setRawPage] = useState(0);
  const [activity,setActivity] = useState({});
  const [pageSize,setPageSize] = useState(25);
  const [recordFilter,setRecordFilter] = useState("functional");
  const [period,setPeriod] = useState("day"),[date,setDate] = useState(today),[rows,setRows] = useState([]),[busy,setBusy] = useState(false);
  useEffect(() => { fetch("/api/stats/auth",{cache:"no-store"}).then(r=>r.json()).then(v=>setAuth(!!v.authenticated)).catch(()=>setAuth(false)); },[]);
  const start = period==="day"?date:startOf(date,period==="week"?6:29);
  useEffect(() => {
    if (!auth) return;
    let active=true;
    setBusy(true);setError("");
    fetch("/api/stats/report?"+new URLSearchParams({start,end:date}),{cache:"no-store"}).then(async r=>{if(!r.ok){const v=await r.json().catch(()=>({}));throw Error(v.error||"통계 조회에 실패했습니다.");}return r.json();}).then(v=>{if(active){setRows(v.rows||[]);setActivity(v.activity||{});}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
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
      group.events.sort((a,b)=>new Date(eventTime(a))-new Date(eventTime(b)) || Number(a.id)-Number(b.id));
      group.first=group.events[0];
      group.last=group.events[group.events.length-1];
      return group;
    }).sort((a,b)=>new Date(eventTime(b.last))-new Date(eventTime(a.last)));
  },[rows]);
  const activeSessions = useMemo(() => sessionRows.filter(group => group.events.some(isFunctionalEvent)).length, [sessionRows]);
  const accessOnlySessions = sessionRows.length - activeSessions;
  const visibleSessions = useMemo(() => sessionRows.filter(group => recordFilter === "all" || (recordFilter === "functional" ? group.events.some(isFunctionalEvent) : !group.events.some(isFunctionalEvent))), [sessionRows,recordFilter]);
  const pageCount = Math.max(1,Math.ceil(visibleSessions.length/pageSize));
  const stats=useMemo(()=>{
    const counts={},facilities={},languages={},hours={},dates={};let visits=0,questions=0,routes=0,feedback=0,solved=0;
    for(const r of rows){const d=dateKst(r.created_at);const h=new Intl.DateTimeFormat("en-GB",{timeZone:KST,hour:"2-digit",hourCycle:"h23"}).format(new Date(r.created_at));dates[d]=(dates[d]||0)+1;hours[h]=(hours[h]||0)+1;
      if(r.event_type==="page_view")visits++;
      if(r.event_type==="ai_question")questions++;
      if(r.event_type==="route_search"&&r.event_name==="request")routes++;
      if(r.event_type==="quick_menu"){if(r.event_name==="facility"&&isFacilityContext(r.context))facilities[r.context]=(facilities[r.context]||0)+1;else counts[r.event_name]=(counts[r.event_name]||0)+1;}
      if(r.event_type==="feedback"){feedback++;if(r.event_name==="solved")solved++;}
      if(r.event_type==="page_view"||r.event_type==="quick_menu"||r.event_type==="ai_question")languages[r.language]=(languages[r.language]||0)+1;
    }
    return {visits,questions,routes,counts,facilities,languages,hours,dates,feedback,solved};
  },[rows]);
  const chart=(data,labels)=>{const entries=Object.entries(data).sort((a,b)=>labels?b[1]-a[1]:a[0].localeCompare(b[0]));const max=Math.max(1,...entries.map(x=>x[1]));return entries.length?<div style={{display:"grid",gap:10}}>{entries.map(([key,value])=><div key={key} style={{display:"grid",gridTemplateColumns:"110px 1fr 42px",alignItems:"center",gap:10,fontSize:13}}><span>{labels?.[key]||key}</span><div style={{height:12,borderRadius:8,background:"#edf4f3",overflow:"hidden"}}><div style={{height:"100%",width:(value/max*100)+"%",background:"#16836e",borderRadius:8}}/></div><strong style={{textAlign:"right"}}>{value}</strong></div>)}</div>:<p style={{color:"#7a858d"}}>해당 기간 기록이 없습니다.</p>;};
  const timeline=(data, hourly=false)=>{
    const entries=hourly?Array.from({length:24},(_,h)=>[String(h).padStart(2,"0"),data[String(h).padStart(2,"0")]||0]):Object.entries(data).sort((a,b)=>a[0].localeCompare(b[0]));
    const max=Math.max(1,...entries.map(([,n])=>n));
    return entries.length?<div style={{display:"flex",alignItems:"flex-end",gap:4,height:130,paddingTop:14}}>{entries.map(([key,n],i)=><div key={key} title={(hourly?key+"시":key)+" · "+n+"건"} style={{flex:1,minWidth:0,textAlign:"center"}}><div style={{fontSize:10,color:"#526d73",height:16}}>{n||""}</div><div style={{height:Math.max(2,n/max*85),background:n?"#16836e":"#e8efee",borderRadius:"4px 4px 0 0"}}/><div style={{height:18,fontSize:10,color:"#647a82",whiteSpace:"nowrap"}}>{hourly?(i%3===0?key+"시":""):(entries.length<=7||i%5===0?key.slice(5):"")}</div></div>)}</div>:<p>해당 기간 기록이 없습니다.</p>;
  };
  const login=async(e)=>{e.preventDefault();setError("");try{const r=await fetch("/api/stats/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});const j=await r.json();if(!r.ok)throw Error(j.error||"로그인 실패");setPassword("");setAuth(true);}catch(e){setError(e.message);}};
  const logout=async()=>{await fetch("/api/stats/auth",{method:"DELETE"});setAuth(false);setRows([]);};
  return <main style={{minHeight:"100dvh",background:"#f5f8f8",color:"#19323a",fontFamily:"system-ui,sans-serif",padding:"24px 14px"}}>
    <div style={{maxWidth:1360,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",marginBottom:22,gap:12}}><div><h1 style={{fontSize:22,margin:0}}>종로5가역 AI 안내 통계</h1><p style={{color:"#667b83",fontSize:13,margin:"6px 0 0"}}>관리자 전용 · 한국시간(KST) 기준</p></div>{auth&&<div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,flexWrap:"wrap"}}><button type="button" role="switch" aria-label="이 브라우저 통계 제외" aria-checked={analyticsExcluded===true} disabled={analyticsExcluded===null} onClick={toggleAnalyticsExcluded} title="켜면 이 브라우저의 Vercel 방문 분석과 자체 통계 수집을 제외합니다. 로그아웃 후에도 유지됩니다." style={{border:analyticsExcluded?"1px solid #16836e":"1px solid #ccd9da",background:analyticsExcluded?"#e7f5ee":"#fff",color:analyticsExcluded?"#087f69":"#526970",borderRadius:9,padding:10,cursor:"pointer",fontSize:12}}>이 브라우저 통계 제외 <strong>{analyticsExcluded===null?"확인 중":analyticsExcluded?"ON":"OFF"}</strong></button><button onClick={logout} style={{border:"1px solid #ccd9da",background:"#fff",borderRadius:9,padding:10,cursor:"pointer"}}>로그아웃</button></div>}</header>
      {auth===null?<p>인증 확인 중…</p>:!auth?<form onSubmit={login} style={{...card,maxWidth:420,margin:"60px auto"}}><h2 style={{marginTop:0,fontSize:18}}>관리자 로그인</h2><label htmlFor="stats-password">관리자 비밀번호</label><input id="stats-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",padding:12,border:"1px solid #b9c9cc",borderRadius:9,margin:"10px 0 16px"}}/><button type="submit" style={{background:"#087f69",color:"white",border:0,borderRadius:9,padding:"11px 20px",cursor:"pointer"}}>로그인</button>{error&&<p role="alert" style={{color:"#ba3333"}}>{error}</p>}</form>:<>
        <p style={{fontSize:12,color:"#667b83",lineHeight:1.7,margin:"0 0 14px"}}>통계 제외는 현재 브라우저에만 적용되며 로그아웃 후에도 유지됩니다. 다른 기기·브라우저에서는 각각 설정해 주세요. 설정 변경 후 이미 열린 챗봇 탭은 새로고침해 주세요. 과거 기록은 삭제하지 않습니다.</p>
        {preferenceError&&<p role="alert" style={{color:"#ba3333"}}>{preferenceError}</p>}
        <section style={{...card,display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,marginBottom:14}}><label>조회 기준 <select value={period} onChange={e=>setPeriod(e.target.value)} style={{marginLeft:8,padding:9,borderRadius:8,border:"1px solid #c8d7d9"}}><option value="day">일별</option><option value="week">최근 7일</option><option value="month">최근 30일</option></select></label><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:14}}>기준 날짜</span>
          <button type="button" aria-label="이전 날짜" onClick={()=>setDate(d=>shiftDate(d,-1))} style={{padding:"8px 11px",background:"#fff",border:"1px solid #c8d7d9",borderRadius:8,cursor:"pointer"}}>‹</button>
          <select aria-label="연도" value={Number(date.slice(0,4))} onChange={e=>setDate(d=>changeDatePart(d,"year",e.target.value))} style={{padding:9,borderRadius:8,border:"1px solid #c8d7d9"}}>{Array.from({length:Math.max(1,Number(today().slice(0,4))-2024+1)},(_,i)=>2024+i).map(y=><option key={y} value={y}>{y}년</option>)}</select>
          <select aria-label="월" value={Number(date.slice(5,7))} onChange={e=>setDate(d=>changeDatePart(d,"month",e.target.value))} style={{padding:9,borderRadius:8,border:"1px solid #c8d7d9"}}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
          <select aria-label="일" value={Number(date.slice(8,10))} onChange={e=>setDate(d=>changeDatePart(d,"day",e.target.value))} style={{padding:9,borderRadius:8,border:"1px solid #c8d7d9"}}>{Array.from({length:new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),0)).getUTCDate()},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}일</option>)}</select>
          <button type="button" aria-label="다음 날짜" disabled={date>=today()} onClick={()=>setDate(d=>shiftDate(d,1))} style={{padding:"8px 11px",background:"#fff",border:"1px solid #c8d7d9",borderRadius:8,cursor:date>=today()?"not-allowed":"pointer",opacity:date>=today()?0.4:1}}>›</button>
        </div><span style={{fontSize:12,color:"#667b83"}}>{start} ~ {date}</span></section>
        {error&&<p role="alert" style={{color:"#ba3333"}}>{error}</p>}{busy&&<p>통계 불러오는 중…</p>}
        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:14}}>{[["접속 횟수",stats.visits],["실제 기능 이용 세션",activeSessions],["접속만 한 세션",accessOnlySessions],["빠른 안내",Object.values(stats.counts).reduce((a,b)=>a+b,0)],["AI 질문",stats.questions],["길찾기 검색",stats.routes]].map(([label,n])=><div key={label} style={card}><div style={{fontSize:12,color:"#647a82"}}>{label}</div><strong style={{display:"block",fontSize:28,marginTop:7}}>{n.toLocaleString()}</strong></div>)}</section>
        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,440px),1fr))",gap:14}}>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>빠른 안내 메뉴별 이용량</h2>{chart(stats.counts,names)}</div>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>시설별 안내 선택</h2>{chart(stats.facilities,FACILITY_LABELS)}<p style={{fontSize:11,color:"#687c82",marginBottom:0}}>세부 수집 시작 이후 기록입니다. 빠른 안내 메뉴 클릭 수와 별도로 집계합니다.</p></div>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>언어별 이용 이벤트</h2>{chart(stats.languages,langs)}</div>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>날짜별 이벤트 추이</h2>{timeline(stats.dates)}</div>
          <div style={card}><h2 style={{fontSize:16,marginTop:0}}>시간대별 이벤트 (KST)</h2>{timeline(stats.hours,true)}</div>
        </section>
        <section style={{...card,marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:12}}>
            <div><h2 style={{fontSize:16,margin:0}}>접속·이용 기록 (Raw Data)</h2><p style={{fontSize:12,color:"#687c82",margin:"5px 0 0"}}>조회 기간 내 {sessionRows.length.toLocaleString()}개 세션 기록 · 기능 이용 {activeSessions.toLocaleString()}개 · 목록 {visibleSessions.length.toLocaleString()}개 · 최근 활동순 · {pageSize}개씩 표시</p></div>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <label>기록 <select aria-label="기록 필터" value={recordFilter} onChange={e=>{setRecordFilter(e.target.value);setRawPage(0);}} style={{padding:7,border:"1px solid #ccd9da",borderRadius:8,background:"#fff"}}><option value="functional">기능 이용만</option><option value="all">전체 기록</option><option value="accessOnly">접속·언어 변경만</option></select></label>
              <label>표시 <select aria-label="페이지당 기록 수" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setRawPage(0);}} style={{padding:7,border:"1px solid #ccd9da",borderRadius:8,background:"#fff"}}>{[10,25,50].map(n=><option key={n} value={n}>{n}개</option>)}</select></label>
              <button disabled={rawPage===0} onClick={()=>setRawPage(p=>Math.max(0,p-1))} style={{padding:"7px 12px",border:"1px solid #ccd9da",borderRadius:8,background:"#fff",cursor:"pointer"}}>이전</button>
              <span>{rawPage+1} / {pageCount}</span>
              <button disabled={rawPage>=pageCount-1} onClick={()=>setRawPage(p=>Math.min(pageCount-1,p+1))} style={{padding:"7px 12px",border:"1px solid #ccd9da",borderRadius:8,background:"#fff",cursor:"pointer"}}>다음</button>
            </div>
          </div>
          <div role="region" aria-label="접속·이용 기록 목록" tabIndex={0} style={{border:"1px solid #e3eaed",borderRadius:10}}>
            <table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:12,textAlign:"left"}}>
              <thead><tr>{["접속시간 (KST)","국가","기기 / 환경","활동 내역 (시간순)"].map(h=><th key={h} style={{padding:"10px 9px",borderBottom:"1px solid #dce5e9",color:"#61777f",whiteSpace:"nowrap",background:"#f1f6f6"}}>{h}</th>)}</tr></thead>
              <tbody>{visibleSessions.slice(rawPage*pageSize,(rawPage+1)*pageSize).map((group,rowIndex)=>{
                const r=group.first;
                const functional = group.events.some(isFunctionalEvent);
                return <tr key={group.key} style={{background:rowIndex%2?"#f8fbfb":"#fff"}}>
                  <td style={{padding:"7px 9px",borderBottom:"1px solid #edf1f2",whiteSpace:"nowrap",verticalAlign:"top"}}>{timeKst(eventTime(r))} <span style={{fontSize:10,color:functional?"#087f69":"#8b9398"}}>· {functional?"기능 이용":"접속만"}</span><div style={{color:"#819096",marginTop:3,fontSize:11}}>{r.session_id?"세션 "+r.session_id.slice(0,8):"이전 기록"} · {group.events.length}개 활동 · 화면 이용 {screenTime(activity[r.session_id])}</div></td>
                  <td style={{padding:"7px 9px",borderBottom:"1px solid #edf1f2",whiteSpace:"nowrap",verticalAlign:"top"}}>{countryLabels[r.country]||r.country||"미확인"}</td>
                  <td style={{padding:"7px 9px",borderBottom:"1px solid #edf1f2",whiteSpace:"nowrap",verticalAlign:"top"}}>{r.device_type||"미확인"}<div style={{color:"#819096",marginTop:4,whiteSpace:"nowrap"}}>{[r.os_type,r.browser].filter(Boolean).join(" · ")||"미확인"}</div></td>
                  <td style={{padding:"7px 9px",borderBottom:"1px solid #edf1f2",minWidth:180,verticalAlign:"top"}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{group.events.map((e,i)=>{
                      const action=e.event_type==="gate_action"?(gateActions[e.event_name]||e.event_name):e.event_type==="quick_menu"?(e.event_name==="facility"&&isFacilityContext(e.context)?"시설: "+FACILITY_LABELS[e.context]:(names[e.event_name]||e.event_name)):e.event_type==="language_change"?"언어: "+(langs[e.event_name]||e.event_name):e.event_type==="route_search"?"길찾기: "+({request:"요청",success:"성공",failure:"실패"}[e.event_name]||e.event_name):e.event_type==="feedback"?"피드백: "+({solved:"해결됨",not_solved:"미해결"}[e.event_name]||e.event_name):eventLabels[e.event_type]||e.event_type;
                      const contextLabel=e.event_type==="feedback"&&e.context?.startsWith("gate_")?gateActions[e.context.slice(5)]:e.event_type==="feedback"&&isFacilityContext(e.context)?FACILITY_LABELS[e.context]:null;
                      return <span key={e.id||i} title={timeKst(eventTime(e))+" · "+(langs[e.language]||e.language)} style={{display:"inline-block",background:"#eef5f3",color:"#285d52",borderRadius:6,padding:"2px 5px",whiteSpace:"nowrap",fontSize:11}}>{contextLabel?contextLabel+" · ":""}{action}</span>;
                    })}</div>
                  </td>
                </tr>;
              })}</tbody>
            </table>
            {!visibleSessions.length&&<p style={{color:"#7a858d",fontSize:13}}>선택한 조건에 해당하는 기록이 없습니다.</p>}
          </div>
          <p style={{fontSize:12,color:"#687c82",lineHeight:1.6,marginBottom:0}}>목록은 기본적으로 기능 이용 세션만 표시합니다. 전체 기록과 상단 통계는 그대로 보존됩니다. 화면 이용시간은 수집 시작 이후 같은 세션에서 화면이 보였던 누적 시간입니다. 화면 잠금·다른 앱이나 탭으로 이동한 시간은 제외하며, 실제로 읽었는지까지 확인하지는 않습니다. 약 15초마다 저장하며 갑작스러운 종료나 통신 실패 시 일부 누락될 수 있습니다. 이전 기록은 미측정으로 표시합니다. 국가는 접속 IP 기반 추정 국가이며 실제 국적이나 현재 위치를 보장하지 않습니다. IP 주소, 기기 고유식별자, 전체 User-Agent, 질문 내용은 저장하지 않습니다. 기록은 페이지를 새로 열 때 생성되는 임시 익명 세션별로 묶습니다. 과거 기록은 세션 ID가 없어 개별 표시됩니다. 이름·IP·기기 고유식별자는 저장하지 않습니다.</p>
        </section>
        <p style={{color:"#687c82",fontSize:12,lineHeight:1.7}}>접속 횟수는 페이지 로드 기준이며 순 방문자 수가 아닙니다. 실제 기능 이용 세션은 빠른 안내·게이트 세부 동작·AI 질문·길찾기 검색·피드백 이벤트가 하나 이상 있는 세션이며, 단순 접속과 언어 변경만 있는 세션은 제외합니다. 세션 수는 실제 사람 수가 아니며, 세션 ID가 없는 과거 기록은 이벤트별로 개별 집계됩니다. 날짜·시간 차트는 수집된 전체 이벤트 수입니다. 실제 문의 감소나 해결률을 의미하지 않습니다. 통계는 수집 기능 배포 이후부터 기록됩니다.</p>
      </>}
    </div>
  </main>;
}
