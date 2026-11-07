'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {stationMaster,searchStationMaster} from '../lib/station-master';
import {stationName} from '../lib/stationNameI18n';
import graph from '../data/trainLostGraph.json';
import directions from '../data/trainLostDirection.json';
import {positionGroups} from './position/groups';
import {positionMessage} from './position/message';
import {positionDestination,positionStation} from './position/destination';
import '../v2/v2.css';
import '../v2/design-refresh.css';
import './arrival-test.css';
const copy={
 ko:{title:'실시간 열차정보',next:'다음 열차',back:'뒤로',refresh:'새로고침',loading:'열차 위치정보 확인 중…',empty:'다가오는 열차정보 없음',error:'위치정보 조회 실패',train:'열차번호',destination:'행선지',location:'현재 위치',updated:'정보 기준',automatic:'30초 간격 갱신 · 열차 위치 기준',source:'서울시 실시간 열차 위치정보',details:'상세 보기',unsupported:'선로 연결정보가 없습니다.',pick:'기준역 선택',search:'역명 · 역코드 검색',all:'전체',noMatches:'검색 결과가 없습니다.',requestLine:'요청 호선',rows:'전체',rowsUnit:'행',currentStation:'현재 기준역',fetched:'조회 시각'},
 en:{title:'Live train arrivals',next:'Next trains',back:'Back',refresh:'Refresh',loading:'Checking arrivals…',empty:'No arrival information',error:'Could not load arrivals',train:'Train',destination:'Destination',location:'Additional message',updated:'Data as of',automatic:'Updates every 30 seconds',source:'Seoul real-time subway arrivals',details:'Details',unsupported:'Track connections unavailable.',pick:'Select station',search:'Station name or code',all:'All',noMatches:'No matching stations.',requestLine:'Requested line',rows:'Total',rowsUnit:'rows',currentStation:'Selected station',fetched:'Fetched at'},
 ja:{title:'リアルタイム列車情報',next:'次の列車',back:'戻る',refresh:'更新',loading:'到着情報を確認中…',empty:'到着情報がありません',error:'取得できませんでした',train:'列車番号',destination:'行先',location:'補足情報',updated:'情報時刻',automatic:'30秒ごとに更新',source:'ソウル市地下鉄到着情報',details:'詳細',unsupported:'線路接続情報がありません。',pick:'駅を選択',search:'駅名・駅コード',all:'すべて',noMatches:'該当する駅はありません。',requestLine:'対象路線',rows:'合計',rowsUnit:'件',currentStation:'選択駅',fetched:'取得時刻'},
 zh:{title:'实时列车信息',next:'下一班列车',back:'返回',refresh:'刷新',loading:'正在查询…',empty:'暂无到站信息',error:'查询失败',train:'列车编号',destination:'终点站',location:'补充信息',updated:'信息时间',automatic:'每30秒更新',source:'首尔市地铁到站信息',details:'详情',unsupported:'暂无线路连接信息。',pick:'选择车站',search:'车站名称或编号',all:'全部',noMatches:'没有匹配的车站。',requestLine:'查询线路',rows:'共',rowsUnit:'条',currentStation:'所选车站',fetched:'获取时间'}
};
const value=x=>x===null||x===undefined||x===''?'—':String(x);

const rawLabel={ko:'서울시 원문',en:'Seoul API original',ja:'ソウル市の原文',zh:'首尔市原文'};


function Arrow({right=false}){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={right?'M4 12h16m-6-6 6 6-6 6':'M20 12H4m6-6-6 6 6 6'}/></svg>;}
const css={button:{border:'1px solid #dce7df',background:'#fff',color:'#456453',borderRadius:9,minHeight:40,padding:'7px 10px',fontSize:12,cursor:'pointer'},field:{width:'100%',border:'1px solid #dce7df',borderRadius:10,padding:11,fontSize:16},chip:{display:'inline-grid',placeItems:'center',color:'#fff',borderRadius:'50%',width:22,height:22,fontSize:11,flexShrink:0},subtle:{fontSize:12,color:'#718478',lineHeight:1.6}};
const C={line:'#dce7df',green:'#1c8064',muted:'#718478'};
const displayName=(s,lang)=>s?.names?.[lang]||s?.names?.en||s?.names?.ko||'—';
export default function ArrivalTestPage(){
 const [stationCode,setStationCode]=useState(null),[picker,setPicker]=useState(false),[line,setLine]=useState('8'),[query,setQuery]=useState(''),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[showRaw,setShowRaw]=useState(false),[view,setView]=useState('summary'),[lang,setLang]=useState('ko');
 const sequence=useRef(0),refreshRef=useRef(()=>{}),titleRef=useRef(null);
 const station=stationMaster.find(s=>s.stationCode===stationCode),t=copy[lang];
 const lines=useMemo(()=>[...new Set(stationMaster.map(s=>s.line))].sort((a,b)=>Number(a)-Number(b)),[]);
 const choices=useMemo(()=>searchStationMaster(query,line),[query,line]);
 useEffect(()=>{const params=new URLSearchParams(window.location.search),code=params.get('station')||'2816',s=stationMaster.find(x=>x.stationCode===code);if(!s){setError('지원하지 않는 역코드입니다.');return;}setStationCode(s.stationCode);setLine(s.line);if(copy[params.get('lang')])setLang(params.get('lang'));const restore=()=>setView(new URLSearchParams(window.location.search).get('view')==='details'?'details':'summary');restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[]);
 useEffect(()=>{if(!stationCode)return;let stopped=false,inFlight=false;const controller=new AbortController(),id=++sequence.current;
  async function refresh(){if(inFlight||stopped||document.visibilityState!=='visible')return;inFlight=true;setLoading(true);setError('');try{
    const currentStation=stationMaster.find(x=>x.stationCode===stationCode);
    if(!currentStation)throw Error('INVALID_STATION');
    const response=await fetch('/api/arrival-test/position?line='+encodeURIComponent(currentStation.line)+'&t='+Date.now(),{cache:'no-store',signal:controller.signal});
    const payload=await response.json();
    const providerCode=payload.raw?.errorMessage?.code||payload.raw?.RESULT?.CODE;
    if(!response.ok||(providerCode&&!['INFO-000','INFO-200'].includes(providerCode)))throw Error(payload.error||providerCode||'HTTP '+response.status);
    if(String(payload.line)!==String(currentStation.line))throw Error('POSITION_LINE_MISMATCH');
    if(!Array.isArray(payload.raw?.realtimePositionList)&&providerCode!=='INFO-200')throw Error('INVALID_POSITION_DATA');
    if(!stopped&&id===sequence.current)setData(payload);
   }catch(e){if(!controller.signal.aborted&&!stopped&&id===sequence.current){setData(null);setError(String(e.message||e));}}
   finally{inFlight=false;if(!stopped&&id===sequence.current)setLoading(false);}}
  refreshRef.current=refresh;void refresh();const timer=setInterval(refresh,30000);const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);return()=>{stopped=true;controller.abort();clearInterval(timer);refreshRef.current=()=>{};document.removeEventListener('visibilitychange',visible);};
 },[stationCode]);
 useEffect(()=>{if(view==='details')titleRef.current?.focus({preventScroll:true});},[view]);
 function changeView(next){
  setView(next);
  const u=new URL(window.location.href);
  if(next==='summary')u.searchParams.delete('view');
  else u.searchParams.set('view','details');
  u.searchParams.delete('train');
  u.searchParams.delete('dir');
  window.history.pushState(null,'',u.pathname+u.search);
  window.scrollTo(0,0);
 }
 function choose(s){setStationCode(s.stationCode);setLine(s.line);setPicker(false);setData(null);setShowRaw(false);setView('summary');const u=new URL(window.location.href);u.searchParams.set('station',s.stationCode);u.searchParams.delete('view');u.searchParams.delete('train');u.searchParams.delete('dir');window.history.replaceState(null,'',u.pathname+u.search);}
 const all=Array.isArray(data?.raw?.realtimePositionList)?data.raw.realtimePositionList:[];
 const {groups,supported}=positionGroups(all,station?.line,station?.names.ko,graph,directions);
 const status=row=>({
  '0':{ko:'진입',en:'Entering',ja:'進入',zh:'进站'},
  '1':{ko:'도착',en:'Arrived',ja:'到着',zh:'到站'},
  '2':{ko:'출발',en:'Departed',ja:'発車',zh:'已发车'},
  '3':{ko:'전역 출발',en:'Left previous station',ja:'前駅発',zh:'前站发车'}
 }[String(row.trainSttus)]?.[lang]||'—');
 const direction=g=>station?.line==='2'
   ?(g.dir==='0'?({ko:'내선',en:'Inner loop',ja:'内回り',zh:'内环'})[lang]:({ko:'외선',en:'Outer loop',ja:'外回り',zh:'外环'})[lang])
   :(g.dir==='0'?({ko:'상행',en:'Upbound',ja:'上り',zh:'上行'})[lang]:({ko:'하행',en:'Downbound',ja:'下り',zh:'下行'})[lang]);
 const heading=g=>g.next.length?g.next.map(name=>stationName(name,lang)||name).join(' · '):direction(g);
 const summaryDestination=row=>positionDestination(row.statnTnm,lang,stationName,station?.line,row.updnLine);
 const message=error?t.error+': '+error:!data?t.loading:!supported?t.unsupported:null;

 return <main className="v2-app v2-design-refresh arrival-test" lang={lang==='zh'?'zh-CN':lang}><div className="at-wrap">
  <header className="at-toolbar">{view==='details'&&<button className="at-back" onClick={()=>changeView('summary')} aria-label={t.back}><Arrow/></button>}<h1 ref={titleRef} tabIndex={-1}>{t.title}</h1><button className="at-station" onClick={()=>{setQuery('');setLine(station?.line||'');setPicker(true);}}><span className="se-line" style={{background:station?.color}}>{station?.line||'?'}</span><span>{station?.names[lang]||'역 선택'}</span>⌄</button><select aria-label="Language" value={lang} onChange={e=>{setLang(e.target.value);const u=new URL(window.location.href);u.searchParams.set('lang',e.target.value);window.history.replaceState(null,'',u.pathname+u.search);}}><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option></select>{view==='summary'&&<button className="at-refresh" onClick={()=>refreshRef.current()} disabled={loading||!stationCode} aria-label={t.refresh}>↻</button>}</header>
  {view==='summary'?<section className="v2-trains" aria-label={t.next}><div className="v2-summary-board">
    {groups.map((g,index)=><div className="v2-summary-direction" key={g.dir}>
      <button className="v2-summary-heading" onClick={()=>changeView('details')} aria-label={heading(g)+' · '+direction(g)+' · '+t.details}>
        {index===0&&<Arrow/>}<span>{heading(g)}</span>{index===1&&<Arrow right/>}
      </button>
      {[0,1].map(i=>{const item=!error&&g.trains[i],dest=item?summaryDestination(item.row):null;return <button className="v2-summary-train at-train" key={i} onClick={()=>changeView('details')}>
        <span className="v2-summary-destination" title={dest?.full||''}>
          {dest?<><span>{dest.bound}</span>{dest.qualifier&&<small>{dest.qualifier}</small>}</>:'—'}
        </span>
        <b className={item?'v2-arrival-available':''} title={item?positionMessage(item,lang):''}>
          <span className="at-message">{item?positionMessage(item,lang):'—'}</span>
        </b>
      </button>;})}
    </div>)}
  </div>{message&&<div className="v2-summary-notice" role="status"><span>{message}</span></div>}</section>:
  <section className="v2-arrival-details"><div className="v2-arrival-detail-head"><div><small>{t.source}</small><h2>{station?.names[lang]} · {t.next}</h2></div><button onClick={()=>refreshRef.current()} disabled={loading}>{loading?t.loading:t.refresh}</button></div>
    <p className="v2-arrival-caption">{t.automatic}</p>
    {message&&<p className="v2-arrival-message" role="status">{message}</p>}
    {!error&&<div className="at-detail-grid">
      {groups.map(g=><section className="v2-arrival-group at-detail-column" key={g.dir}>
        <h3>{heading(g)} · {direction(g)}</h3>
        {[0,1].map(i=>{const item=g.trains[i];if(!item)return <div className="at-detail-empty" key={i}>{t.empty}</div>;
          const {row:r,stops}=item;
          return <article className="v2-arrival-train at-detail-card" key={r.trainNo+'-'+i}>
            <div className="at-card-top"><strong>{positionMessage({row:r,stops},lang)}</strong><span>{status(r)}</span></div>
            <dl>
              <dt>{t.destination}</dt><dd>{lang==='ko'?r.statnTnm||'—':positionDestination(r.statnTnm,lang,stationName,station?.line,r.updnLine).full}</dd>
              <dt>{t.train}</dt><dd>{value(r.trainNo)}</dd>
              <dt>{t.location}</dt><dd>{positionStation(r.statnNm,lang,stationName)} · {status(r)}</dd>
            </dl>
            <small title={value(r.recptnDt)}>{t.updated} {String(r.recptnDt||'').split(' ').at(-1)||'—'}</small>
            <details className="at-row-fields">
              <summary>{rawLabel[lang]}</summary>
              <pre>{JSON.stringify(r,null,2)}</pre>
            </details>
          </article>;
        })}
      </section>)}
    </div>}
  </section>}
    {picker&&<div role="presentation" onClick={()=>setPicker(false)} style={{position:'fixed',inset:0,zIndex:20,background:'#14283c70',display:'flex',alignItems:'center',justifyContent:'center',padding:12}}>
      <section role="dialog" aria-modal="true" aria-label={t.pick} onClick={e=>e.stopPropagation()} style={{background:'#fff',width:'100%',maxWidth:510,maxHeight:'86dvh',display:'flex',flexDirection:'column',borderRadius:17,padding:16,gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong style={{fontSize:18}}>{t.pick}</strong><button aria-label="닫기" style={css.button} onClick={()=>setPicker(false)}>✕</button></div>
        <input autoFocus style={css.field} value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button style={{...css.button,background:line===''?'#eaf4f1':'#fff'}} onClick={()=>setLine('')}>{t.all}</button>
          {lines.map(l=><button key={l} onClick={()=>setLine(l)} style={{...css.button,background:line===l?'#eaf4f1':'#fff',padding:'5px 8px',minHeight:32,borderColor:line===l?'#529985':C.line}}>{l}호선</button>)}
        </div>
        <div style={{overflowY:'auto',minHeight:100}}>
          {choices.map(s=><button key={s.stationCode} onClick={()=>choose(s)} style={{...css.button,width:'100%',textAlign:'left',display:'flex',alignItems:'center',gap:9,margin:'0 0 6px',background:s.stationCode===stationCode?'#eaf4ef':'#fff'}}>
            <span style={{...css.chip,background:s.color,width:22,height:22,fontSize:10}}>{s.line}</span><strong style={{flex:1}}>{displayName(s,lang)}</strong><span style={css.subtle}>{s.stationCode}</span></button>)}
          {!choices.length&&<p style={css.subtle}>{t.noMatches}</p>}
        </div>
      </section>
    </div>}


{view==='summary'&&<details className="at-diagnostics"><summary>{rawLabel[lang]} · JSON</summary><p>{t.requestLine}: {data?.line||'—'} · {t.rows} {all.length}{t.rowsUnit} / {t.currentStation}: {displayName(station,lang)}</p><p>{t.fetched}: {data?.fetchedAt||'—'}</p><pre>{JSON.stringify(data?.raw||{},null,2)}</pre></details>}
</div></main>;
}
