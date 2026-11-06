'use client';
import { useEffect, useMemo, useState } from 'react';
import { stationMaster } from '../lib/station-master';
import { stationName } from '../lib/stationNameI18n';
import { arrivalStatus } from '../lib/train-arrivals';
import useTrainArrivals from '../v2/useTrainArrivals';

const words = {
  ko:{title:'실시간 열차정보',station:'역 선택',line:'호선',refresh:'새로고침',loading:'조회 중…',updated:'정보 기준',interval:'30초 자동 갱신',empty:'표시할 열차정보가 없습니다.',error:'열차정보 조회에 실패했습니다.',stale:'정보 갱신이 지연되고 있습니다.',unknown:'확인 중',arrival:'도착',approaching:'진입 중',noEta:'도착시간 확인 중',minutes:n:`약 ${n}분 후`,notice:'열차 운행 정보는 서울시 실시간 지하철 도착정보를 기준으로 하며 실제 운행과 차이가 있을 수 있습니다.'},
  en:{title:'Live train arrivals',station:'Station',line:'Line',refresh:'Refresh',loading:'Loading…',updated:'Data as of',interval:'Auto-refresh every 30s',empty:'No train information available.',error:'Could not load arrivals.',stale:'Updates are delayed.',unknown:'Checking',arrival:'Arrived',approaching:'Approaching',noEta:'ETA unavailable',minutes:n:`About ${n} min`,notice:'Based on Seoul real-time subway arrival data. Actual train times may vary.'},
  ja:{title:'リアルタイム列車到着',station:'駅を選択',line:'路線',refresh:'更新',loading:'取得中…',updated:'情報時刻',interval:'30秒ごとに更新',empty:'列車情報がありません。',error:'取得に失敗しました。',stale:'情報の更新が遅れています。',unknown:'確認中',arrival:'到着',approaching:'進入中',noEta:'到着時刻確認中',minutes:n:`約${n}分後`,notice:'ソウル市のリアルタイム到着情報を使用しています。実際の運行とは異なる場合があります。'},
  zh:{title:'实时列车到站',station:'选择车站',line:'线路',refresh:'刷新',loading:'查询中…',updated:'信息时间',interval:'每30秒更新',empty:'暂无列车信息。',error:'无法获取列车信息。',stale:'信息更新延迟。',unknown:'查询中',arrival:'已到站',approaching:'进站中',noEta:'到站时间待确认',minutes:n:`约${n}分钟后`,notice:'采用首尔市实时地铁到站信息，实际运行可能有所不同。'}
};
const directionLabel={ko:{상행:'상행',하행:'하행',내선:'내선',외선:'외선'},en:{상행:'Upbound',하행:'Downbound',내선:'Inner loop',외선:'Outer loop'},ja:{상행:'上り',하행:'下り',내선:'内回り',외선:'外回り'},zh:{상행:'上行',하행:'下行',내선:'内环',외선:'外环'}};
const s={page:{minHeight:'100vh',background:'#f3f7f8',color:'#163347',padding:'22px 14px',fontFamily:'system-ui, -apple-system, sans-serif'},wrap:{maxWidth:780,margin:'0 auto'},panel:{background:'#fff',border:'1px solid #dce6eb',borderRadius:16,padding:20,marginBottom:14},label:{display:'block',fontSize:12,color:'#60788a',marginBottom:7},select:{width:'100%',fontSize:15,padding:'12px 10px',borderRadius:10,border:'1px solid #cbdde5',background:'#fff',color:'#163347'},button:{border:'none',borderRadius:10,padding:'11px 15px',fontWeight:700,background:'#087b69',color:'white',cursor:'pointer'},train:{border:'1px solid #e0e9ec',borderRadius:12,padding:14,marginTop:10},sub:{fontSize:12,color:'#617789'},grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10}};
function time(v){const d=new Date(v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d):'—';}
function statusLabel(train,now,t){const x=arrivalStatus(train,now);if(x?.state==='minutes')return t.minutes(x.minutes);if(x?.state==='approaching')return t.approaching;if(x?.state==='arrived')return t.arrival;if(x?.state==='previousDeparted'||x?.state==='previousApproaching'||x?.state==='previousArrived')return train.message||t.noEta;return train.message||t.noEta;}
export default function LivePage(){
  const [stationCode,setStationCode]=useState('0154');
  const [lang,setLang]=useState('ko');
  const [line,setLine]=useState('');
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const p=new URLSearchParams(window.location.search);const code=p.get('station');const found=stationMaster.find(x=>x.stationCode===code);if(found){setStationCode(found.stationCode);setLine(found.line);}const language=p.get('lang');if(words[language])setLang(language);},[]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(id);},[]);
  const arrivals=useTrainArrivals(true,stationCode);
  const station=stationMaster.find(x=>x.stationCode===stationCode);
  const lines=useMemo(()=>[...new Set(stationMaster.map(x=>x.line))].sort((a,b)=>Number(a)-Number(b)),[]);
  const visible=useMemo(()=>stationMaster.filter(x=>!line||x.line===line),[line]);
  const t=words[lang];
  function changeStation(code){setStationCode(code);const url=new URL(window.location.href);url.searchParams.set('station',code);url.searchParams.set('lang',lang);window.history.replaceState(null,'',url);}
  function changeLang(value){setLang(value);const url=new URL(window.location.href);url.searchParams.set('lang',value);window.history.replaceState(null,'',url);}
  return <main style={s.page}><div style={s.wrap}>
    <header style={{...s.panel,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
      <div><h1 style={{fontSize:23,margin:'0 0 5px'}}>{t.title}</h1><span style={s.sub}>Seoul Subway · Live Arrivals</span></div>
      <select aria-label="Language" value={lang} onChange={e=>changeLang(e.target.value)} style={{...s.select,width:'auto',minWidth:112}}><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option></select>
    </header>
    <section style={s.panel}>
      <div style={s.grid}>
        <label><span style={s.label}>{t.line}</span><select style={s.select} value={line} onChange={e=>{const next=e.target.value;setLine(next);const first=stationMaster.find(x=>!next||x.line===next);if(first)changeStation(first.stationCode);}}><option value="">전체</option>{lines.map(x=><option key={x} value={x}>{x}{lang==='ko'?'호선':''}</option>)}</select></label>
        <label><span style={s.label}>{t.station}</span><select style={s.select} value={stationCode} onChange={e=>changeStation(e.target.value)}>{visible.map(x=><option key={x.stationCode} value={x.stationCode}>{x.names?.[lang]||x.names?.ko} ({x.line})</option>)}</select></label>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:16,flexWrap:'wrap'}}><div><strong>{station?.names?.[lang]||station?.names?.ko||''}</strong><div style={s.sub}>{t.interval}{arrivals.data?.updatedAt?' · '+t.updated+' '+time(arrivals.data.updatedAt)+' KST':''}</div></div><button style={s.button} disabled={arrivals.loading} onClick={arrivals.refresh}>{arrivals.loading?t.loading:'↻ '+t.refresh}</button></div>
    </section>
    <section style={s.panel}>
      {arrivals.error&&<p role="alert" style={{color:'#b42318'}}>{t.error}</p>}
      {!arrivals.data&&!arrivals.error&&<p role="status">{t.loading}</p>}
      {arrivals.data?.status==='stale'&&<p role="status" style={{color:'#9c6414'}}>{t.stale}</p>}
      {(arrivals.data?.groups||[]).map((group,i)=><div key={group.id||i} style={{marginBottom:20}}>
        <h2 style={{fontSize:17,margin:'0 0 10px'}}>{(group.nextStations||[]).length?group.nextStations.map(n=>stationName(n,lang)).join(' · ')+' · ':''}{directionLabel[lang][group.provider]||group.provider}</h2>
        {!group.trains?.length?<p style={s.sub}>{t.empty}</p>:group.trains.map((train,j)=><div key={(train.trainNo||'train')+'-'+j} style={s.train}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}>
            <div><strong style={{fontSize:16}}>{train.destination?stationName(train.destination,lang):t.unknown}</strong><div style={{...s.sub,marginTop:4}}>{train.trainNo||'—'}{train.location?' · '+stationName(train.location,lang):''}</div></div>
            <strong style={{color:'#087b69',textAlign:'right'}}>{statusLabel(train,now,t)}</strong>
          </div>
          <div style={{...s.sub,marginTop:9}}>{t.updated} {time(train.receivedAt)} KST</div>
        </div>)}
      </div>)}
      {arrivals.data&&!arrivals.data.groups?.length&&<p>{t.empty}</p>}
    </section>
    <p style={{...s.sub,lineHeight:1.6,padding:'0 10px'}}>{t.notice}</p>
  </div></main>;
}
