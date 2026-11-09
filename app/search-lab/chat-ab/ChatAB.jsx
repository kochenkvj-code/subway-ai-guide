'use client';
import {useMemo,useRef,useState} from 'react';
import {stationMaster} from '../../lib/station-master';

const PRESETS=[
  {label:'신라호텔',query:'신라호텔'},
  {label:'둔촌역',query:'둔촌역'},
  {label:'둔촌동역',query:'둔촌동역'},
  {label:'화장실',query:'화장실 어디에 있나요?'},
  {label:'타역 시설',query:'종로3가역 화장실 어디예요?'},
  {label:'동묘앞 호선',query:'동묘앞역 수유실 어디에 있나요?'},
];
const LANGUAGES=[['ko','한국어'],['en','English'],['ja','日本語'],['zh','简体中文']];
const ms=v=>typeof v==='number'?(v/1000).toFixed(2)+'초':'—';
const n=v=>typeof v==='number'?v.toLocaleString('ko-KR'):'—';
const cleanName=s=>s.names?.ko+(s.names?.ko?.endsWith('역')?'':'역');
const avg=(runs,variant,field)=>{const a=runs.map(x=>x[variant]?.[field]).filter(x=>typeof x==='number');return a.length?a.reduce((sum,v)=>sum+v,0)/a.length:null;};
const isHttp=url=>{try{return ['http:','https:'].includes(new URL(url).protocol);}catch{return false;}};

function ResultCard({type,data}){
  const isA=type==='A';
  return <article className={'cab-result cab-result-'+type.toLowerCase()}>
    <div className="cab-result-head">
      <div className="cab-result-ident">
        <span className="cab-letter">{type}</span>
        <div><h3>{isA?'현재 V2 · 원본 고정':'간소화 후보'}</h3><p>{isA?'2026.11.09 원본 프롬프트':'이전 improvedPrompt 중심'}</p></div>
      </div>
      {data?<span className={'cab-status '+(data.ok?'cab-ok':'cab-fail')}>{data.ok?'응답 완료':'오류'}</span>:<span className="cab-status">미실행</span>}
    </div>
    {data?.ok ? <>
      <div className="cab-metrics">
        <div><span>Gemini 응답시간</span><strong>{ms(data.responseMs)}</strong></div>
        <div><span>전체 처리시간</span><strong>{ms(data.totalMs)}</strong></div>
        <div><span>전체 토큰</span><strong>{n(data.usage?.totalTokenCount)}</strong></div>
        <div><span>검색</span><strong>{data.searched?'실행':'기록 없음'}</strong></div>
      </div>
      <div className="cab-answer-label">승객에게 보이는 답변</div>
      <div className="cab-answer">{data.answer}</div>
      <div className="cab-meta-grid">
        <div><span>추천 메뉴</span><strong>{data.recommendedMenu||'없음'}</strong></div>
        <div><span>목적지 검색어</span><strong>{data.routeQuery||'없음'}</strong></div>
        <div><span>종료 사유</span><strong>{data.finishReason||'—'}</strong></div>
        <div><span>입력 / 출력 / 생각 토큰</span><strong>{n(data.usage?.promptTokenCount)} / {n(data.usage?.candidatesTokenCount)} / {n(data.usage?.thoughtsTokenCount)}</strong></div>
      </div>
      <details className="cab-detail" open>
        <summary>검색 기록과 출처 <small>질의 {(data.googleSearchQueries||[]).length}개 · 출처 {(data.sources||[]).length}개</small></summary>
        {(data.googleSearchQueries||[]).length>0?<div className="cab-tags">{data.googleSearchQueries.map((q,i)=><span key={i}>{q}</span>)}</div>:<p className="cab-empty-line">검색 질의 기록 없음</p>}
        {(data.sources||[]).length>0?<ol className="cab-source-list">{data.sources.map((s,i)=><li key={i}>{isHttp(s.url)?<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title||s.domain||s.url}</a>:<span>{s.title||'출처'}</span>}</li>)}</ol>:<p className="cab-empty-line">제공된 출처 없음</p>}
      </details>
      <details className="cab-detail">
        <summary>AI 원문·메타데이터 확인</summary>
        <pre className="cab-raw">{data.raw||''}</pre>
        <div className="cab-inline-note">출처 연결 정보 {data.supportCount??0}개 · {data.promptKind}</div>
      </details>
    </> : data ? <div className="cab-result-error">{data.error||'실험 실패'}</div> :
      <div className="cab-result-placeholder"><span>◎</span><p>실험 실행 후<br/>여기에 답변과 진단정보가 표시됩니다.</p></div>}
  </article>;
}

export default function ChatAB(){
  const [stationCode,setStationCode]=useState('0154');
  const [filter,setFilter]=useState('');
  const [question,setQuestion]=useState('신라호텔');
  const [lang,setLang]=useState('ko');
  const [repeat,setRepeat]=useState(3);
  const [contextQuestion,setContextQuestion]=useState('');
  const [contextAnswer,setContextAnswer]=useState('');
  const [runs,setRuns]=useState([]);
  const [roundIndex,setRoundIndex]=useState(0);
  const [busy,setBusy]=useState(false);
  const [completed,setCompleted]=useState(0);
  const [notice,setNotice]=useState('');
  const controllerRef=useRef(null);
  const station=stationMaster.find(s=>s.stationCode===stationCode);
  const options=useMemo(()=>{
    const q=filter.trim().toLowerCase().replace(/\s/g,'');
    return q?stationMaster.filter(s=>(String(s.stationCode)+s.line+'호선'+Object.values(s.names||{}).join('')+(s.aliases||[]).join('')).toLowerCase().replace(/\s/g,'').includes(q)).slice(0,80):stationMaster;
  },[filter]);
  const selected=runs[roundIndex]||null;
  const aAvg=avg(runs,'A','responseMs');
  const bAvg=avg(runs,'B','responseMs');
  const completedPairs=runs.filter(r=>r.A?.ok&&r.B?.ok).length;
  const activeHistory=contextQuestion.trim()&&contextAnswer.trim();
  async function execute(){
    if(busy)return;
    if(!question.trim()){setNotice('비교할 질문을 입력해 주세요.');return;}
    if(Boolean(contextQuestion.trim())!==Boolean(contextAnswer.trim())){setNotice('대화 이력을 사용하려면 이전 질문과 답변을 모두 입력해 주세요.');return;}
    if(contextQuestion.length>500||contextAnswer.length>2500){setNotice('이전 대화는 질문 500자·답변 2,500자 이내로 입력해 주세요.');return;}
    const aborter=new AbortController();
    controllerRef.current=aborter;
    const snapshot={question:question.trim(),stationCode,lang};
    if(activeHistory){snapshot.history=[{role:'user',text:contextQuestion.trim()},{role:'assistant',text:contextAnswer.trim()}];snapshot.historyCompletedAt=Date.now();}
    else {snapshot.history=[];snapshot.historyCompletedAt=null;}
    setBusy(true);setRuns([]);setRoundIndex(0);setCompleted(0);setNotice('');
    let stop=false;
    try{
      for(let round=0;round<repeat&&!stop;round++){
        const order=round%2===0?['A','B']:['B','A'];
        for(const variant of order){
          if(aborter.signal.aborted){stop=true;break;}
          try{
            const response=await fetch('/api/search-lab/chat-ab',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({...snapshot,variant}),
              signal:aborter.signal,cache:'no-store'
            });
            const data=await response.json().catch(()=>({ok:false,error:response.status===429?'요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.':'요청 처리 중 응답 형식 오류가 발생했습니다.'}));
            const result=data?.ok?data:{ok:false,error:data?.error||'HTTP '+response.status,variant};
            setRuns(previous=>{
              const next=[...previous];
              next[round]={...(next[round]||{round:round+1,order:order.join(' → ')}),[variant]:result};
              return next;
            });
            setRoundIndex(round);
            setCompleted(v=>v+1);
            if(response.status===429){setNotice('호출 제한에 도달했습니다. 10분 기준 최대 30회까지 가능하니 잠시 뒤 다시 실행해 주세요.');stop=true;break;}
          }catch(error){
            if(aborter.signal.aborted){stop=true;break;}
            setRuns(previous=>{
              const next=[...previous];
              next[round]={...(next[round]||{round:round+1,order:order.join(' → ')}),[variant]:{ok:false,error:'네트워크 오류: '+(error?.message||'연결 실패')}};
              return next;
            });
            setCompleted(v=>v+1);
          }
        }
      }
    }finally{setBusy(false);controllerRef.current=null;}
  }
  function download(){
    const data={exportedAt:new Date().toISOString(),configuration:{stationCode,station:cleanName(station),lang,question,repeat,contextIncluded:!!activeHistory,model:'gemini-3.5-flash-lite',thinking:'LOW',maxOutputTokens:1200,googleSearch:true},runs};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='chat-policy-ab-'+Date.now()+'.json';
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  return <main className="cab-page">
    <div className="cab-shell">
      <header className="cab-header">
        <div className="cab-brand"><div className="cab-logo">M<span>↗</span></div><div><strong>SUBWAY AI GUIDE</strong><small>Experiment / Prompt Policy</small></div></div>
        <a className="cab-home" href="/">운영 V2로 돌아가기 <span>↗</span></a>
      </header>
      <section className="cab-hero">
        <div className="cab-kicker"><span className="cab-live-dot"></span> RATE-LIMITED EXPERIMENT · v1.1</div>
        <h1>일반 채팅 <em>응답 정책 A/B 실험실</em></h1>
        <p>현재 V2 원본과 간소화 후보를 <strong>같은 모델·검색·시스템 지침·언어·파서</strong>로 비교합니다. 운영 채팅은 변경하지 않습니다.</p>
        <div className="cab-hero-meta"><span>Gemini 3.5 Flash-Lite</span><span>LOW</span><span>1,200 tokens</span><span>Google Search</span><span>교차 순서 A→B / B→A</span></div>
      </section>

      <section className="cab-config">
        <div className="cab-section-title"><span className="cab-section-num">01</span><div><h2>실험 조건 설정</h2><p>A/B에 완전히 동일하게 적용됩니다.</p></div></div>
        <div className="cab-form-grid">
          <label className="cab-field"><span>기준역 <small>{station?station.line+'호선 · '+station.stationCode:''}</small></span><input type="text" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="역명으로 선택지 필터링" aria-label="역명 검색" /><select value={stationCode} onChange={e=>setStationCode(e.target.value)} aria-label="기준역 선택">{!options.some(s=>s.stationCode===stationCode)&&station&&<option value={stationCode}>{station.line}호선 {cleanName(station)} · {station.stationCode}</option>}{options.map(s=><option key={s.stationCode} value={s.stationCode}>{s.line}호선 {cleanName(s)} · {s.stationCode}</option>)}</select></label>
          <div className="cab-field"><span>답변 언어</span><div className="cab-language">{LANGUAGES.map(([id,label])=><button type="button" key={id} className={lang===id?'active':''} onClick={()=>setLang(id)}>{label}</button>)}</div><span className="cab-field-hint">답변·검색어 다국어 품질도 함께 확인</span></div>
          <label className="cab-field cab-wide"><span>승객 질문</span><textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={2} maxLength={500} placeholder="실제 일반 채팅에 입력할 질문" /><div className="cab-presets">{PRESETS.map(p=><button key={p.label} type="button" onClick={()=>setQuestion(p.query)}>{p.label}</button>)}</div></label>
          <label className="cab-field"><span>반복 비교 <small>각 회차에 A와 B 모두 호출</small></span><select value={repeat} onChange={e=>setRepeat(Number(e.target.value))}><option value={1}>1회 · 총 2호출</option><option value={3}>3회 · 총 6호출</option><option value={5}>5회 · 총 10호출</option></select><span className="cab-field-hint">검색 출처는 호출마다 달라질 수 있습니다.</span></label>
          <div className="cab-field cab-context"><span>선택: 이전 대화 맥락 <small>빈칸이면 양쪽 모두 이력 없음</small></span><input value={contextQuestion} onChange={e=>setContextQuestion(e.target.value)} maxLength={500} placeholder="이전 사용자 질문 (선택)" /><textarea value={contextAnswer} onChange={e=>setContextAnswer(e.target.value)} rows={2} maxLength={2500} placeholder="이전 AI 답변 (선택)" /></div>
        </div>
        <div className="cab-runbar">
          <div className="cab-run-caption"><span className="cab-lock">⌁</span> 별도 키 입력 없이 실행됩니다. A/B 호출 조건은 같으며, 10분당 30회로 자동 제한됩니다.</div>
          <div className="cab-run-actions">{busy&&<button type="button" className="cab-secondary" onClick={()=>controllerRef.current?.abort()}>남은 호출 중단</button>}<button type="button" className="cab-primary" disabled={busy||!question.trim()} onClick={execute}>{busy?'실험 진행 중 · '+completed+'/'+(repeat*2):'A/B 비교 실행'} <span>→</span></button></div>
        </div>
        {notice&&<div role="alert" className="cab-notice">{notice}</div>}
      </section>

      <section className="cab-results-section">
        <div className="cab-results-top">
          <div className="cab-section-title"><span className="cab-section-num">02</span><div><h2>응답 비교 결과</h2><p>승객 답변·검색·메타데이터를 나란히 확인합니다.</p></div></div>
          <div className="cab-results-actions">{runs.length>0&&<><label>회차 <select value={Math.min(roundIndex,runs.length-1)} onChange={e=>setRoundIndex(Number(e.target.value))}>{runs.map((r,i)=><option key={i} value={i}>{i+1}회 · {r.order}</option>)}</select></label><button type="button" onClick={download} className="cab-export">JSON 결과 저장 ↓</button></>}</div>
        </div>
        <div className="cab-compare-head"><div><span>A</span> CURRENT V2 / FROZEN</div><div><span>B</span> SIMPLIFIED / CANDIDATE</div></div>
        <div className="cab-result-grid"><ResultCard type="A" data={selected?.A}/><ResultCard type="B" data={selected?.B}/></div>
        {runs.length>0&&<div className="cab-summary">
          <div className="cab-summary-title"><h3>반복 실험 요약</h3><p>실제로 Gemini가 완료된 호출만 평균에 반영 · 성공한 완전한 A/B 쌍 {completedPairs}회</p></div>
          <div className="cab-summary-cards">
            <div><span>A 평균 응답시간</span><strong>{ms(aAvg)}</strong></div>
            <div><span>B 평균 응답시간</span><strong>{ms(bAvg)}</strong></div>
            <div><span>B − A 평균 차이</span><strong>{aAvg!=null&&bAvg!=null?((bAvg-aAvg)/1000>0?'+':'')+((bAvg-aAvg)/1000).toFixed(2)+'초':'—'}</strong></div>
          </div>
          <div className="cab-table-wrap"><table><thead><tr><th>회차</th><th>순서</th><th>A 응답</th><th>B 응답</th><th>A 추천</th><th>B 추천</th></tr></thead><tbody>{runs.map((r,i)=><tr key={i}><td>{i+1}</td><td>{r.order}</td><td>{r.A?.ok?ms(r.A.responseMs):r.A?'오류':'—'}</td><td>{r.B?.ok?ms(r.B.responseMs):r.B?'오류':'—'}</td><td>{r.A?.recommendedMenu||'—'}</td><td>{r.B?.recommendedMenu||'—'}</td></tr>)}</tbody></table></div>
        </div>}
      </section>

      <footer className="cab-footer"><span>SUBWAY AI GUIDE · INTERNAL QA</span><span>운영 API /api/v2/chat 미변경 · 검색/모델 호출 비용 발생</span></footer>
    </div>
  </main>;
}
