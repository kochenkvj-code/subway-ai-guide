'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {stationMaster,searchStationMaster} from '../lib/station-master';
import {arrivalStationConfig} from '../lib/station-arrivals';
import '../v2/v2.css';
import '../v2/design-refresh.css';
import './arrival-test.css';
const copy={
 ko:{title:'실시간 열차정보',next:'다음 열차',back:'뒤로',refresh:'새로고침',loading:'도착정보 확인 중…',empty:'도착정보 없음',error:'도착정보 조회 실패',train:'열차번호',destination:'행선지',location:'보조 메시지',updated:'정보 기준',automatic:'30초 간격 갱신',source:'서울시 실시간 지하철 도착정보',details:'상세 보기'},
 en:{title:'Live train arrivals',next:'Next trains',back:'Back',refresh:'Refresh',loading:'Checking arrivals…',empty:'No arrival information',error:'Could not load arrivals',train:'Train',destination:'Destination',location:'Additional message',updated:'Data as of',automatic:'Updates every 30 seconds',source:'Seoul real-time subway arrivals',details:'Details'},
 ja:{title:'リアルタイム列車情報',next:'次の列車',back:'戻る',refresh:'更新',loading:'到着情報を確認中…',empty:'到着情報がありません',error:'取得できませんでした',train:'列車番号',destination:'行先',location:'補足情報',updated:'情報時刻',automatic:'30秒ごとに更新',source:'ソウル市地下鉄到着情報',details:'詳細'},
 zh:{title:'实时列车信息',next:'下一班列车',back:'返回',refresh:'刷新',loading:'正在查询…',empty:'暂无到站信息',error:'查询失败',train:'列车编号',destination:'终点站',location:'补充信息',updated:'信息时间',automatic:'每30秒更新',source:'首尔市地铁到站信息',details:'详情'}
};
const value=x=>x===null||x===undefined||x===''?'—':String(x);
function CalculatedTime({row,now,lang}){
 const raw=row?.barvlDt,stamp=String(row?.recptnDt||'').trim();
 const received=/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?$/.test(stamp)?Date.parse(stamp.replace(' ','T')+'+09:00'):NaN;
 const seconds=raw===null||raw===undefined||String(raw).trim()===''?NaN:Number(raw);
 const remaining=now!==null&&Number.isFinite(received)&&Number.isFinite(seconds)&&seconds>=0?Math.ceil(Math.max(0,seconds-(now-received)/1000)):null;
 const label={ko:'계산값',en:'Calculated',ja:'計算値',zh:'计算值'}[lang];
 const minutes=remaining===null?0:Math.floor(remaining/60),secondsPart=remaining===null?0:remaining%60;
 const formatted={ko:`${minutes}분 ${secondsPart}초`,en:`${minutes}m ${secondsPart}s`,ja:`${minutes}分 ${secondsPart}秒`,zh:`${minutes}分 ${secondsPart}秒`}[lang];
 return <span className="at-calculated" title="max(0, barvlDt − (현재시각 − recptnDt)의 경과 초)">{label}: {remaining===null?'—':formatted}</span>;
}
function destination(row){const text=String(row?.trainLineNm||'');return text.match(/^\s*(.+?행)\s*(?:[-–—]|$)/)?.[1]||text||'—';}
function Arrow({right=false}){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={right?'M4 12h16m-6-6 6 6-6 6':'M20 12H4m6-6-6 6 6 6'}/></svg>;}
const css={button:{border:'1px solid #dce7df',background:'#fff',color:'#456453',borderRadius:9,minHeight:40,padding:'7px 10px',fontSize:12,cursor:'pointer'},field:{width:'100%',border:'1px solid #dce7df',borderRadius:10,padding:11,fontSize:16},chip:{display:'inline-grid',placeItems:'center',color:'#fff',borderRadius:'50%',width:22,height:22,fontSize:11,flexShrink:0},subtle:{fontSize:12,color:'#718478',lineHeight:1.6}};
const C={line:'#dce7df',green:'#1c8064',muted:'#718478'};
const displayName=s=>s?.names?.ko||'역 선택';
const fields=['subwayId','statnNm','updnLine','btrainNo','ordkey','arvlCd','arvlMsg2','arvlMsg3','recptnDt','barvlDt','trainLineNm'];
const cell=value;
export default function ArrivalTestPage(){
 const [stationCode,setStationCode]=useState(null),[picker,setPicker]=useState(false),[line,setLine]=useState('8'),[query,setQuery]=useState(''),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[showRaw,setShowRaw]=useState(false),[view,setView]=useState('summary'),[lang,setLang]=useState('ko');
 const [now,setNow]=useState(null);
 const [ownKey,setOwnKey]=useState(''),[showOwnKey,setShowOwnKey]=useState(false);
 const [checkingKey,setCheckingKey]=useState(false),[keyResult,setKeyResult]=useState(null),[keyError,setKeyError]=useState('');
 useEffect(()=>{const tick=()=>setNow(Date.now());tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[]);
 const sequence=useRef(0),refreshRef=useRef(()=>{}),titleRef=useRef(null);
 const station=stationMaster.find(s=>s.stationCode===stationCode),t=copy[lang];
 const lines=useMemo(()=>[...new Set(stationMaster.map(s=>s.line))].sort((a,b)=>Number(a)-Number(b)),[]);
 const choices=useMemo(()=>searchStationMaster(query,line),[query,line]);
 useEffect(()=>{const params=new URLSearchParams(window.location.search),code=params.get('station')||'2816',s=stationMaster.find(x=>x.stationCode===code);if(!s){setError('지원하지 않는 역코드입니다.');return;}setStationCode(s.stationCode);setLine(s.line);if(copy[params.get('lang')])setLang(params.get('lang'));setView(params.get('view')==='details'?'details':'summary');const pop=()=>setView(new URLSearchParams(window.location.search).get('view')==='details'?'details':'summary');window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
 useEffect(()=>{if(!stationCode)return;let stopped=false,inFlight=false;const controller=new AbortController(),id=++sequence.current;
  async function refresh(){if(inFlight||stopped||document.visibilityState!=='visible')return;inFlight=true;setLoading(true);setError('');try{const response=await fetch('/api/arrival-test?station='+encodeURIComponent(stationCode)+'&t='+Date.now(),{cache:'no-store',signal:controller.signal}),payload=await response.json();const code=payload.raw?.errorMessage?.code||payload.raw?.RESULT?.CODE;if(!response.ok||code&&!['INFO-000','INFO-200'].includes(code))throw Error(payload.error||code||'HTTP '+response.status);if(payload.station?.stationCode!==stationCode)throw Error('ARRIVAL_STATION_MISMATCH');if(!stopped&&id===sequence.current)setData(payload);}catch(e){if(!controller.signal.aborted&&!stopped&&id===sequence.current)setError(String(e.message||e));}finally{inFlight=false;if(!stopped&&id===sequence.current)setLoading(false);}}
  refreshRef.current=refresh;void refresh();const timer=setInterval(refresh,30000);const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);return()=>{stopped=true;controller.abort();clearInterval(timer);refreshRef.current=()=>{};document.removeEventListener('visibilitychange',visible);};
 },[stationCode]);
 useEffect(()=>{if(view==='details')titleRef.current?.focus({preventScroll:true});},[view]);
 function changeView(next){setView(next);const u=new URL(window.location.href);if(next==='summary')u.searchParams.delete('view');else u.searchParams.set('view',next);window.history.pushState(null,'',u.pathname+u.search);window.scrollTo(0,0);}
 function choose(s){setStationCode(s.stationCode);setLine(s.line);setPicker(false);setData(null);setShowRaw(false);const u=new URL(window.location.href);u.searchParams.set('station',s.stationCode);window.history.replaceState(null,'',u.pathname+u.search);}
 const all=Array.isArray(data?.raw?.realtimeArrivalList)?data.raw.realtimeArrivalList:[],config=stationCode?arrivalStationConfig(stationCode):null;
 const matching=all.filter(row=>String(row.subwayId)===String(station?.subwayId)&&config?.matchesStation(row.statnNm));
 const observed=[...new Set(matching.map(row=>row.updnLine).filter(Boolean))];
 const directions=['외선','내선','상행','하행'].filter(d=>observed.includes(d));if(!directions.length)directions.push(...(station?.line==='2'?['외선','내선']:['상행','하행']));
 const groups=directions.map(dir=>{const rows=matching.filter(r=>r.updnLine===dir),names=[...new Set(rows.map(r=>String(r.trainLineNm||'').match(/[-–—]\s*(.+?)\s*방면\s*$/)?.[1]).filter(Boolean))];return {dir,rows,heading:names.join(' · ')||dir};});
 const message=error?t.error:!data?t.loading:!matching.length?t.empty:null;
 const keyRows=Array.isArray(keyResult?.raw?.realtimeArrivalList)
  ?keyResult.raw.realtimeArrivalList.filter(row=>String(row.subwayId)===String(station?.subwayId))
  :[];
 const keyResponseCode=keyResult?.raw?.errorMessage?.code||keyResult?.raw?.RESULT?.CODE||keyResult?.raw?.code||'—';
 const keyResponseText=keyResult?.raw?.message||keyResult?.raw?.errorMessage?.message||keyResult?.raw?.RESULT?.MESSAGE||'';
 async function checkOwnKey(event){
  event.preventDefault();
  if(checkingKey||!stationCode||!ownKey.trim())return;
  setCheckingKey(true);setKeyError('');setKeyResult(null);
  try{
   const response=await fetch('/api/arrival-test/key-check',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({station:stationCode,apiKey:ownKey.trim()})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'HTTP '+response.status);
   setKeyResult(result);
  }catch(error){setKeyError(String(error.message||error));}
  finally{setCheckingKey(false);}
 }

 return <main className="v2-app v2-design-refresh arrival-test" lang={lang==='zh'?'zh-CN':lang}><div className="at-wrap">
  <header className="at-toolbar">{view==='details'&&<button className="at-back" onClick={()=>changeView('summary')} aria-label={t.back}><Arrow/></button>}<h1 ref={titleRef} tabIndex={-1}>{view==='details'?t.title:'도착정보 테스트'}</h1><button className="at-station" onClick={()=>{setQuery('');setLine(station?.line||'');setPicker(true);}}><span className="se-line" style={{background:station?.color}}>{station?.line||'?'}</span><span>{station?.names[lang]||'역 선택'}</span>⌄</button><select aria-label="Language" value={lang} onChange={e=>{setLang(e.target.value);const u=new URL(window.location.href);u.searchParams.set('lang',e.target.value);window.history.replaceState(null,'',u.pathname+u.search);}}><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option></select></header>
  <section className="at-own-key-panel" aria-label="직접 입력한 API 키 조회">
   <form onSubmit={checkOwnKey} autoComplete="off">
    <div className="at-key-panel-head"><strong>내 인증키로 원본 조회</strong><span>수동 1회 테스트</span></div>
    <label htmlFor="at-own-api-key">서울시 실시간 지하철 API 인증키</label>
    <div className="at-key-form-row">
     <input id="at-own-api-key" name="manual-seoul-key" type={showOwnKey?'text':'password'} placeholder="인증키 입력" value={ownKey} onChange={event=>{setOwnKey(event.target.value);setKeyResult(null);setKeyError('');}} autoComplete="off" autoCapitalize="off" spellCheck={false} />
     <button type="button" onClick={()=>setShowOwnKey(x=>!x)} aria-label={showOwnKey?'키 가리기':'키 보기'}>{showOwnKey?'숨기기':'보기'}</button>
     <button type="submit" className="at-key-check-submit" disabled={!stationCode||!ownKey.trim()||checkingKey}>{checkingKey?'조회 중':'키로 조회'}</button>
    </div>
    <p className="at-key-panel-note">선택된 역({station?.names?.ko||'—'})을 입력한 키로 한 번 조회합니다. 키는 URL이나 브라우저 저장소에 기록하지 않으며, 요청 처리에만 사용합니다. 기존 운영 키는 변경되지 않습니다.</p>
   </form>
   {keyError&&<p role="alert" className="at-key-check-error">조회 실패: {keyError}</p>}
   {keyResult&&<div className="at-key-check-results">
    <p className="at-key-check-status">서울시 응답: <strong>{keyResponseCode}</strong> · 원본 {keyRows.length}건</p>
    {keyResponseText&&<p className="at-key-check-error">{keyResponseText}</p>}
    {keyRows.map((row,index)=><div className="at-key-check-row" key={index}>
     <strong>{value(row.updnLine)} · ordkey {value(row.ordkey)} · {destination(row)}</strong>
     <div>{value(row.arvlMsg2)}</div><small>arvlMsg3: {value(row.arvlMsg3)}</small>
     <small>열차 {value(row.btrainNo)} · 생성시각 {value(row.recptnDt)}</small>
    </div>)}
    <details><summary>응답 JSON 보기 (인증키 제외)</summary><pre>{JSON.stringify(keyResult.raw,null,2)}</pre></details>
   </div>}
  </section>
  {view==='summary'?<section className="v2-trains" aria-label={t.next}><div className="v2-summary-board">{groups.map(({dir,rows,heading},index)=><div className="v2-summary-direction" key={dir}><button className="v2-summary-heading" onClick={()=>changeView('details')} aria-label={heading+' · '+t.details}>{index%2===0&&<Arrow/>}<span>{heading}</span>{index%2===1&&<Arrow right/>}</button>{[1,2].map(rank=>{const row=!error&&rows.find(r=>String(r.ordkey||'')[1]===String(rank));return <button className="v2-summary-train at-train" key={rank} onClick={()=>changeView('details')} aria-label={dir+' '+rank+' · '+t.details}><span className="v2-summary-destination">{row?destination(row):'—'}</span><b className={row?'v2-arrival-available':''}><span className="at-message">{row?value(row.arvlMsg2):'—'}</span>{row&&<CalculatedTime row={row} now={now} lang={lang}/>}</b></button>;})}</div>)}</div><div className="at-board-footer"><span role="status">{message||t.automatic}</span><button onClick={()=>refreshRef.current()} disabled={loading||!stationCode} aria-label={t.refresh}>↻</button></div></section>:
  <section className="v2-arrival-details"><div className="v2-arrival-detail-head"><div><small>{t.source}</small><h2>{station?.names[lang]} · {t.next}</h2></div><button onClick={()=>refreshRef.current()} disabled={loading}>{loading?t.loading:t.refresh}</button></div><p className="v2-arrival-caption">{t.automatic}</p>{message&&<p className="v2-arrival-message" role="status">{message}</p>}{!error&&groups.map(({dir,rows,heading})=><section className="v2-arrival-group" key={dir}><h3>{heading} · {dir}</h3>{[1,2].map(rank=>{const records=rows.filter(r=>String(r.ordkey||'')[1]===String(rank));return <div key={rank} className="at-rank">{records.length>1&&<p className="v2-arrival-caption">{rank}순위 · 원본 {records.length}건</p>}{records.map((row,i)=><article className="v2-arrival-train" key={rank+'-'+i}><div><strong><span className="at-message">{value(row.arvlMsg2)}</span><CalculatedTime row={row} now={now} lang={lang}/></strong><span>{value(row.btrainSttus)}</span></div><dl><dt>{t.destination}</dt><dd>{value(row.trainLineNm)}</dd><dt>{t.train}</dt><dd>{value(row.btrainNo)}</dd><dt>{t.location}</dt><dd>{value(row.arvlMsg3)}</dd></dl><small>{t.updated} {value(row.recptnDt)}</small><details className="at-row-fields"><summary>원본 필드</summary><p>ordkey: {value(row.ordkey)} · arvlCd: {value(row.arvlCd)} · barvlDt: {value(row.barvlDt)}</p></details></article>)}</div>;})}{!rows.some(r=>['1','2'].includes(String(r.ordkey||'')[1]))&&<p className="v2-arrival-empty">{t.empty}</p>}</section>)}</section>}
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


<details className="at-diagnostics"><summary>원본 응답 확인</summary><p>계산값은 max(0, barvlDt − 생성 후 경과 초)를 초 단위로 올림 표시합니다. 0초는 실제 도착 판정이 아닙니다. 원본 메시지와 열차 선택에는 영향을 주지 않습니다.</p><p>요청 역명: {data?.requestedStationName||'—'} · 전체 {all.length}행 / 선택 역·호선 {matching.length}행</p><p>조회 시각: {data?.fetchedAt||'—'}</p><pre>{JSON.stringify(data?.raw||{},null,2)}</pre></details>
</div></main>;
}
