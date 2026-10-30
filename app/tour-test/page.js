"use client";
import { useState } from 'react';
import { requestTour as query, currentLocation } from '../lib/tour-client';
const MODES = { nearby: { label:'내 주변', title:'현재 위치 주변 탐색', hint:'조회할 때 현재 위치를 확인해 가까운 관광정보부터 보여드립니다.', api:'locationBasedList2' }, keyword: { label:'장소 검색', title:'이름으로 장소 찾기', hint:'장소명이나 키워드로 전국 관광정보를 검색합니다.', api:'searchKeyword2' }, area: { label:'지역별', title:'지역별 관광정보', hint:'지역과 분류를 선택해 등록된 관광정보를 살펴보세요.', api:'areaBasedList2' }, festival: { label:'축제·행사', title:'기간별 축제·행사', hint:'지역과 날짜 조건으로 행사를 조회합니다. 실제 운영 여부는 주최 측에 확인하세요.', api:'searchFestival2' } };
const TYPES = [['','전체'],['12','관광지'],['14','문화시설'],['39','음식점'],['38','쇼핑'],['28','레포츠'],['32','숙박'],['25','여행코스']];
const AREAS = [['1','서울'],['2','인천'],['31','경기'],['32','강원'],['6','부산'],['4','대구'],['3','대전'],['5','광주'],['7','울산'],['8','세종'],['33','충북'],['34','충남'],['35','경북'],['36','경남'],['37','전북'],['38','전남'],['39','제주']];
const INTRO_LABELS = {detail:'상세 소개',images:'사진'};
function dateInSeoul(offset=0) { const d = new Date(); d.setUTCDate(d.getUTCDate()+offset); return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d); }
function Picture({src,alt=''}) { const [failed,setFailed] = useState(false); return src && !failed ? <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/> : <div className="placeholder">등록된 사진이 없습니다</div>; }
function Detail({place,onBack}) {
  const [tab,setTab] = useState('detail');
  const [cache,setCache] = useState({});
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  async function load(kind) {
    setTab(kind);setError('');if(cache[kind])return;
    setLoading(true);
    try { const result=await query({mode:kind,id:place.id,...(place.type?{type:place.type}:{})});setCache(prev=>({...prev,[kind]:result})); }
    catch(e){setError(e.message);}finally{setLoading(false);}
  }
  const common = cache.detail?.items?.[0];
  return <div className="detail"><button className="secondary" onClick={onBack}>← 검색 결과로</button><div className="detail-heading"><span className="badge">장소 상세</span><h2>{place.title}</h2><p>{place.address || '주소 정보 없음'}</p><a href={`https://map.naver.com/p/search/${encodeURIComponent(place.title+' '+place.address)}`} target="_blank" rel="noopener noreferrer">지도에서 보기 ↗</a></div><nav className="tabs" aria-label="상세 정보">{Object.entries(INTRO_LABELS).map(([key,label])=><button key={key} disabled={loading} aria-pressed={tab===key} onClick={()=>load(key)}>{label}</button>)}</nav>{!cache[tab]&&!loading&&!error&&<div className="empty"><p>선택한 정보만 필요할 때 조회합니다.</p><button onClick={()=>load(tab)}>{INTRO_LABELS[tab]} 불러오기</button></div>}{loading&&<p role="status" className="empty">관광정보를 불러오고 있습니다…</p>}{error&&<div className="error" role="alert">{error}<button className="secondary" onClick={()=>load(tab)}>다시 시도</button></div>}{!loading&&!error&&tab==='detail'&&common&&<div className="info-panel"><Picture src={common.image||place.image}/><h3>장소 소개</h3><p className="preserve">{common.description||'등록된 소개가 없습니다.'}</p><dl><dt>주소</dt><dd>{common.address||'정보 없음'}</dd><dt>문의</dt><dd>{common.phone||'정보 없음'}</dd></dl>{common.homepage&&<a href={common.homepage} target="_blank" rel="noopener noreferrer">공식 안내 페이지 ↗</a>}<p className="note">정보 출처: 한국관광공사 · 운영시간·요금은 이용 전 해당 시설에 확인하세요.</p></div>}{!loading&&!error&&tab==='images'&&cache.images&&<div className="photo-grid">{cache.images.images.length?cache.images.images.map((x,i)=><figure key={i}><Picture src={x.url} alt={x.title}/><figcaption>{x.title||'관광 사진'}{x.credit&&` · 이용조건 ${x.credit}`}</figcaption></figure>):<div className="empty">등록된 추가 사진이 없습니다.</div>}</div>}<details className="technical"><summary>사용 API 확인</summary><code>{tab==='detail'?'detailCommon2':'detailImage2'}</code><p>콘텐츠 ID: {place.id}</p></details></div>;
}
export default function TourTest() {
  const [mode,setMode] = useState('nearby');
  const [type,setType] = useState('');const [area,setArea]=useState('1');const [radius,setRadius]=useState('1500');const [keyword,setKeyword]=useState('광장시장');
  const [start,setStart]=useState(()=>dateInSeoul());const [end,setEnd]=useState(()=>dateInSeoul(30));
  const [data,setData]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false);const [selected,setSelected]=useState(null);const [searched,setSearched]=useState(null);const [locating,setLocating]=useState(false);
  function changeMode(next){setMode(next);setData(null);setError('');setSelected(null);setSearched(null);}
  async function load(event) {
    event.preventDefault();setLoading(true);setError('');setData(null);setSelected(null);setSearched(null);
    const params={mode};let accuracy=null;
    try {
      if(mode!=='festival')params.type=type;
      if(mode==='nearby') {
        setLocating(true);
        const position=await currentLocation();
        setLocating(false);
        params.longitude=String(position.coords.longitude);
        params.latitude=String(position.coords.latitude);
        params.radius=radius;
        accuracy=position.coords.accuracy;
      }
      if(mode==='keyword')params.keyword=keyword;
      if(['area','festival'].includes(mode))params.area=area;
      if(mode==='festival'){params.start=start.replaceAll('-','');params.end=end.replaceAll('-','');}
      const result=await query(params);setData(result);
      setSearched({mode,label:MODES[mode].title,accuracy,time:new Date().toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'})});
    } catch(e){setError(e.message);} finally{setLoading(false);setLocating(false);}
  }
  return <main className="tour"><a href="/">← 역 안내로</a><header><small>TOUR API · TEST LAB</small><h1>관광정보 테스트 센터</h1><p>장소를 찾고, 소개·사진까지 순서대로 확인하세요.</p><span>한국관광공사 국문 관광정보 · 실제 API 조회</span></header><div className="workflow"><span><b>1</b> 장소 찾기</span><i>→</i><span><b>2</b> 결과 선택</span><i>→</i><span><b>3</b> 상세 확인</span></div>{selected?<Detail key={selected.id} place={selected} onBack={()=>setSelected(null)}/>:<><nav className="tabs" aria-label="관광정보 조회 방식">{Object.entries(MODES).map(([key,x])=><button key={key} disabled={loading} aria-pressed={mode===key} onClick={()=>changeMode(key)}>{x.label}</button>)}</nav><form className="filters" onSubmit={load}><h2>{MODES[mode].title}</h2><p>{MODES[mode].hint}</p><div className="fields">{mode==='nearby'&&<label>검색 반경<select value={radius} onChange={e=>setRadius(e.target.value)} disabled={loading}><option value="500">500m</option><option value="1500">1.5km</option><option value="3000">3km</option><option value="5000">5km</option></select></label>}{mode==='keyword'&&<label>장소명·키워드<input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="예: 광장시장" maxLength={80} required disabled={loading}/></label>}{['area','festival'].includes(mode)&&<label>지역<select value={area} onChange={e=>setArea(e.target.value)} disabled={loading}>{AREAS.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select></label>}{mode!=='festival'&&<label>관광 분류<select value={type} onChange={e=>setType(e.target.value)} disabled={loading}>{TYPES.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select></label>}{mode==='festival'&&<><label>시작일<input type="date" required value={start} onChange={e=>setStart(e.target.value)} disabled={loading}/></label><label>종료일<input type="date" required min={start} value={end} onChange={e=>setEnd(e.target.value)} disabled={loading}/></label></>}</div><button disabled={loading} type="submit">{locating?'현재 위치 확인 중…':loading?'조회 중…':mode==='nearby'?'현재 위치로 조회':'관광정보 조회'}</button><p className="note">{mode==='nearby'?'위치 접근 권한이 필요합니다. 지하에서는 위치가 부정확할 수 있으며, 표기 거리는 도보 거리가 아닙니다.':'관광공사에 등록된 정보를 조회하며, 모든 장소·행사를 포함하지는 않습니다.'}</p></form>{error&&<div className="error" role="alert">{error}</div>}{loading&&<div className="empty" role="status">{locating?'기기에서 현재 위치를 확인하고 있습니다…':'한국관광공사에서 정보를 불러오고 있습니다…'}</div>}{!loading&&!error&&!data&&<div className="empty">위에서 조건을 선택하고 조회 버튼을 눌러주세요.</div>}{data&&<><div className="result-heading"><h2>조회 결과</h2><span role="status">총 {data.total}건 · 최대 20건 표시</span></div><p className="note">{searched?.label} · {searched?.time} 조회 (한국시간){searched?.mode==='nearby'&&Number.isFinite(searched.accuracy)&&` · 기기 위치 정확도 약 ${Math.round(searched.accuracy).toLocaleString()}m`}</p>{!data.items.length&&<div className="empty">이 조건에 해당하는 결과가 없습니다. 분류·지역·기간을 바꿔보세요.</div>}<section className="results">{data.items.map((x,i)=><article key={x.id||i}><Picture src={x.image}/><div className="body"><span className="badge">{x.type==='15'?'축제·행사':TYPES.find(([code])=>code===x.type)?.[1]||'관광정보'}</span><h2>{x.title}</h2><p>{x.address||'주소 정보 없음'}</p>{x.distance&&<small>기준점에서 약 {Math.round(Number(x.distance)).toLocaleString()}m</small>}{x.start&&<p className="note">{x.start} ~ {x.end}</p>}<div className="card-actions"><button className="secondary" disabled={!x.id} onClick={()=>{setSelected(x);window.scrollTo({top:0,behavior:'smooth'});}}>상세 보기</button><a href={`https://map.naver.com/p/search/${encodeURIComponent(x.title+' '+x.address)}`} target="_blank" rel="noopener noreferrer">지도 ↗</a></div></div></article>)}</section></>}<details className="technical"><summary>테스트 기능 · API 구성 보기</summary><p>현재 화면: <code>{MODES[mode].api}</code></p><ul><li>장소 찾기: 위치 기반 · 키워드 · 지역별 조회</li><li>축제·행사: 지역과 기간으로 조회</li><li>장소 선택 후: 상세 소개 · 추가 사진</li></ul><p>현재는 국문 서비스입니다. 다국어·숙박 예약·전체 음식점 검색을 제공하는 페이지는 아닙니다. 키는 서버에서만 사용합니다.</p></details></>}<footer>한국관광공사 TourAPI 제공 정보 · 테스트 페이지</footer></main>;
}
