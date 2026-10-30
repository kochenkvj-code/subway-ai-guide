'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

const SOURCES = [
  ['both','전체 기관'],
  ['portal','지하철·공공기관'],
  ['police','경찰관서']
];
const LABEL = {portal:'포털기관', police:'경찰관서'};
function koreaDate(daysAgo = 0) {
  return new Date(Date.now() + 9*3600000 - daysAgo*86400000).toISOString().slice(0,10);
}
function formatDate(value) {
  const s=String(value||'').replace(/[^\d]/g,'');
  return s.length===8 ? s.slice(0,4)+'.'+s.slice(4,6)+'.'+s.slice(6,8) : value || '미등록';
}
function itemKey(item) {
  return [item.source,item.id,item.sequence,item.date,item.title].join('|');
}
function categoryOf(item) {
  return (item.category||'').split(/[>＞]/)[0].trim() || '기타';
}
function Photo({src,title}) {
  const [bad,setBad] = useState(false);
  useEffect(()=>setBad(false),[src]);
  return <div className="lf-photo">{src&&!bad?<img src={src} alt={title+' 습득물 사진'} loading="lazy" referrerPolicy="no-referrer" onError={()=>setBad(true)}/>:<div className="lf-no-photo"><span>▧</span><small>사진 없음</small></div>}</div>;
}
const css = `
.lf{min-height:100dvh;background:#eff3f8;color:#203653;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;padding:24px 16px 54px}
.lf *{box-sizing:border-box}.lf-shell{width:100%;max-width:1040px;margin:0 auto}.lf-top{display:flex;align-items:center;gap:12px;padding:13px 16px;border:1px solid #e2e9f1;border-radius:17px;background:#fff}
.lf-back{width:36px;height:36px;border:0;border-radius:11px;background:#eff5fc;color:#315f95;font-size:24px;cursor:pointer}
.lf-brand{font-size:14px;font-weight:850;flex:1}.lf-brand small{display:block;margin-top:3px;font-size:10px;letter-spacing:1.5px;color:#8296ad;font-weight:700}
.lf-station{font-size:11px;color:#5b789a;white-space:nowrap;background:#f1f5fb;padding:7px 10px;border-radius:10px}.lf-station b{display:inline-grid;place-items:center;background:#245e9d;color:#fff;border-radius:50%;width:20px;height:20px;margin-right:5px}
.lf-hero{display:flex;justify-content:space-between;gap:30px;align-items:center;padding:31px 9px 20px}.lf-hero small{color:#5980ad;letter-spacing:2px;font-size:10px;font-weight:900}
.lf-hero h1{margin:9px 0;font-size:32px;letter-spacing:-1.4px;line-height:1.25}.lf-hero p{color:#778aa0;font-size:13px;line-height:1.8;margin:0}
.lf-hero-mark{display:grid;place-items:center;flex:none;width:88px;height:88px;background:linear-gradient(135deg,#e1ebf9,#f6fafe);border-radius:27px;font-size:39px;color:#3a689d}
.lf-panel{background:#fff;border:1px solid #e1e9f2;border-radius:20px;padding:23px;margin-bottom:18px;box-shadow:0 4px 22px #1c355506}
.lf-section-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:17px}.lf-section-heading strong{font-size:16px}.lf-section-heading small{font-size:11px;color:#96a5b8}
.lf-region{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border:1px solid #dbe8f6;background:#f1f7ff;border-radius:12px;padding:12px 14px;margin:0 0 17px;color:#2e6095;font-size:12px;font-weight:850}
.lf-region small{font-size:10px;font-weight:600;color:#758eac}
.lf-near{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:0 12px 13px}
.lf-near small{font-size:11px;color:#7489a1;line-height:1.65}
.lf-row{display:flex;gap:12px;flex-wrap:wrap}.lf-field{display:flex;flex:1 1 150px;flex-direction:column;gap:7px;font-size:12px;font-weight:750;color:#506780}
.lf-field input{font:inherit;font-size:13px;font-weight:500;color:#233852;width:100%;border:1px solid #dce5f0;background:#f9fbfe;border-radius:11px;padding:12px 13px;min-height:44px;outline-color:#7aa5d9}
.lf-field input[type=date]{min-width:0;color-scheme:light}.lf-wide{flex:2 1 270px}.lf-sources{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:17px}.lf-chip{border:1px solid #dbe5f0;background:#f7fafe;border-radius:50px;padding:9px 15px;color:#677d98;font-size:12px;font-weight:750;cursor:pointer}
.lf-chip.active{border-color:#326aa9;background:#e9f2ff;color:#245a94}.lf-controls{display:flex;gap:9px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:17px}
.lf-help{font-size:11px;color:#8395ab;line-height:1.6}.lf-primary{background:#265f9d;border:1px solid #265f9d;border-radius:11px;padding:12px 22px;color:#fff;font-size:13px;font-weight:800;cursor:pointer}
.lf-primary:disabled,.lf-more:disabled{opacity:.55;cursor:default}.lf-heading-results{display:flex;align-items:center;gap:10px;justify-content:space-between;margin:27px 4px 12px}
.lf-heading-results h2{font-size:18px;letter-spacing:-.4px;margin:0}.lf-heading-results span{font-size:11px;color:#8697aa}
.lf-tags{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 13px}.lf-small-chip{border:1px solid #dce5f0;border-radius:50px;padding:7px 12px;font-size:11px;font-weight:750;background:#fff;color:#607791;cursor:pointer}
.lf-small-chip.active{background:#2e658e;color:white;border-color:#2e658e}.lf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.lf-card{display:flex;gap:13px;min-width:0;text-align:left;width:100%;background:#fff;border:1px solid #e2eaf2;border-radius:17px;padding:13px;color:inherit;cursor:pointer}
.lf-card:hover{border-color:#aac9e6}.lf-photo{width:112px;height:119px;flex:none;border-radius:12px;background:#f0f4f9;overflow:hidden;display:grid;place-items:center}
.lf-photo img{width:100%;height:100%;object-fit:cover}.lf-no-photo{display:grid;place-items:center;gap:5px;color:#acb8c8}.lf-no-photo span{font-size:29px}.lf-no-photo small{font-size:10px}
.lf-card-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}.lf-card-source{font-size:10px;color:#5685af;font-weight:850}
.lf-card-body strong{font-size:14px;line-height:1.55;word-break:keep-all}.lf-card-meta{font-size:11px;color:#7b8ba0;line-height:1.6;overflow-wrap:anywhere}
.lf-card-link{font-size:11px;color:#366c9f;margin-top:auto;font-weight:850;padding-top:7px}
.lf-state{border:1px dashed #cbd9e8;background:#fff;border-radius:17px;text-align:center;padding:35px 18px;color:#7488a1;font-size:13px;line-height:1.8}
.lf-alert{margin:12px 0;border-radius:13px;padding:13px 15px;font-size:12px;line-height:1.8;background:#fff5e5;color:#7c5d30;border:1px solid #f1dfbb}
.lf-alert strong{display:block;font-size:13px}.lf-note{color:#788aa1;font-size:11px;line-height:1.85;margin:15px 4px}
.lf-more{display:block;margin:20px auto 0;background:#fff;color:#2b659f;border:1px solid #cdddeb;border-radius:12px;padding:13px 28px;font-size:13px;font-weight:800;cursor:pointer}
.lf-detail{margin-top:16px;border:1px solid #d7e4f0;border-radius:17px;background:#fff;padding:20px}.lf-detail-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.lf-detail-head strong{font-size:17px}.lf-close{border:0;background:#eef4fb;color:#315f92;width:30px;height:30px;border-radius:9px;cursor:pointer;font-size:18px}
.lf-detail-grid{display:grid;grid-template-columns:108px 1fr;gap:12px 15px;font-size:12px;line-height:1.75;margin-top:17px}
.lf-detail-grid dt{color:#8799ac}.lf-detail-grid dd{margin:0;color:#2b4059;overflow-wrap:anywhere}
.lf-detail-link{display:inline-block;margin-top:15px;color:#28649f;font-size:12px;font-weight:850;text-decoration:none}
.lf-footer{text-align:center;color:#9eacbc;font-size:10px;letter-spacing:1px;margin-top:38px}
@media(max-width:730px){.lf-grid{grid-template-columns:1fr}.lf-hero h1{font-size:27px}.lf-hero-mark{width:70px;height:70px;font-size:33px}}
@media(max-width:510px){.lf{padding:0 0 30px}.lf-top{border-radius:0;border-left:0;border-right:0}.lf-shell{width:100%}.lf-hero{padding:24px 19px 18px}.lf-hero-mark{display:none}.lf-panel{border-radius:16px;margin:0 12px 16px;padding:17px}.lf-heading-results{margin-left:16px;margin-right:16px}.lf-tags,.lf-grid,.lf-alert,.lf-state,.lf-note,.lf-detail{margin-left:12px;margin-right:12px}.lf-grid{gap:10px}.lf-card{padding:11px}.lf-photo{width:95px;height:105px}.lf-field{flex-basis:135px}.lf-wide{flex-basis:100%}.lf-controls .lf-primary{width:100%}}
`;

export default function LostFoundDemo() {
  const [start,setStart] = useState(()=>koreaDate(14));
  const [end,setEnd] = useState(()=>koreaDate());
  const [source,setSource] = useState('both');
  const [keyword,setKeyword] = useState('');
  const [category,setCategory] = useState('전체');
  const [items,setItems] = useState([]);
  const [status,setStatus] = useState(null);
  const [failed,setFailed] = useState([]);
  const [loading,setLoading] = useState(true);
  const [loadingMore,setLoadingMore] = useState(false);
  const [error,setError] = useState('');
  const [page,setPage] = useState(0);
  const [more,setMore] = useState(false);
  const [selected,setSelected] = useState(null);
  const current = useRef(0);
  const filters = useRef(null);
  const load = async (number=1,reset=true,signal) => {
    const id=++current.current;
    const f=reset ? {start,end,source} : filters.current;
    if (!f || !f.start || !f.end || f.start>f.end ||
        (Date.parse(f.end)-Date.parse(f.start))/86400000>90) {
      setError('검색 기간을 확인해 주세요. 최대 90일까지 조회할 수 있어요.');setLoading(false);setLoadingMore(false);return;
    }
    if (reset) {
      filters.current=f;setError('');setItems([]);setCategory('전체');setSelected(null);setLoading(true);
    } else setLoadingMore(true);
    try {
      const params=new URLSearchParams({...f,page:String(number)});
      const response=await fetch('/api/v2/lost-found?'+params,{cache:'no-store',signal});
      const result=await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'SEARCH_FAILED');
      if (current.current!==id || signal?.aborted) return;
      setItems(old => {
        const combined=reset ? result.items : [...old,...result.items];
        const seen=new Set();
        return combined.filter(x=>{
          const key=itemKey(x);
          if(seen.has(key)) return false;
          seen.add(key);return true;
        }).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      });
      setStatus(result.status);setFailed(result.errors||[]);setPage(number);setMore(result.hasMore);
    } catch(e) {
      if (current.current!==id || signal?.aborted) return;
      setError(e?.message==='API_KEY_MISSING' ? 'API 환경변수가 확인되지 않았습니다.' :
        '습득물 검색에 실패했습니다. 연결 상태 또는 API 활용승인을 확인해 주세요.');
    } finally {
      if (current.current===id && !signal?.aborted){setLoading(false);setLoadingMore(false);}
    }
  };
  useEffect(()=>{const c=new AbortController();load(1,true,c.signal);return ()=>c.abort();},[]);
  const cats=useMemo(()=>['전체',...Array.from(new Set(items.map(categoryOf))).slice(0,14)], [items]);
  const visible=useMemo(()=>{
    const q=keyword.trim().toLocaleLowerCase('ko-KR');
    return items.filter(x=>(category==='전체'||categoryOf(x)===category) &&
      (!q||[x.title,x.subject,x.place,x.category,x.color].some(s=>String(s||'').toLocaleLowerCase('ko-KR').includes(q))));
  },[items,category,keyword]);
  const allTotal=status ? Object.values(status).reduce((n,x)=>n+(x.ok&&Number.isFinite(x.total)?x.total:0),0) : 0;
  return <div className="lf"><style>{css}</style><div className="lf-shell">
    <header className="lf-top">
      <button className="lf-back" aria-label="V2 화면으로 돌아가기" onClick={()=>window.location.assign('/v2')}>‹</button>
      <div className="lf-brand">습득물 찾기 <small>SUBWAY AI GUIDE · DEMO</small></div>
      <div className="lf-station">서울 전역 사용 가능</div>
    </header>
    <div className="lf-hero">
      <div><small>LOST &amp; FOUND</small><h1>잃어버린 물건,<br/>함께 찾아볼까요?</h1><p>경찰청 LOST112의 습득물 정보를 한곳에서 확인해 보세요.</p></div>
      <div className="lf-hero-mark" aria-hidden="true">▣</div>
    </div>
    <section className="lf-panel" aria-label="습득물 조회 조건">
      <div className="lf-section-heading"><strong>습득물 검색</strong><small>공식 공공데이터 API</small></div>
      <div className="lf-region"><span>검색지역 · 서울특별시</span><small>전국 제외 · LOST112 공식 API 지역코드 적용</small></div>
      <div className="lf-sources" aria-label="조회 기관 선택">{SOURCES.map(([key,label])=>
        <button key={key} className={'lf-chip'+(source===key?' active':'')} onClick={()=>setSource(key)} aria-pressed={source===key}>{label}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();load(1,true);}}>
        <div className="lf-row">
          <label className="lf-field">시작일<input type="date" value={start} max={end} onChange={e=>setStart(e.target.value)} required/></label>
          <label className="lf-field">종료일<input type="date" value={end} min={start} max={koreaDate()} onChange={e=>setEnd(e.target.value)} required/></label>
          <label className="lf-field lf-wide">물품명·보관장소 키워드<input type="search" value={keyword} maxLength={60} onChange={e=>setKeyword(e.target.value)} placeholder="예: 지갑, 휴대전화, 종로, 가방"/></label>
        </div>
        <div className="lf-controls"><span className="lf-help">검색 기간 최대 90일 · 물품명은 불러온 목록 내 검색</span>
          <button className="lf-primary" type="submit" disabled={loading||loadingMore}>{loading?'조회 중…':'습득물 조회하기'}</button></div>
      </form>
    </section>
    <div className="lf-heading-results"><h2>서울 습득물 조회 결과</h2><span>{loading?'검색 중…':items.length+'건 불러옴'+(allTotal?' · 전체 '+allTotal.toLocaleString('ko-KR')+'건':'')}</span></div>
    {items.length>0&&<div className="lf-tags">{cats.map(cat=><button key={cat} className={'lf-small-chip'+(category===cat?' active':'')} onClick={()=>setCategory(cat)} aria-pressed={category===cat}>{cat}</button>)}</div>}
    {failed.length>0&&<div className="lf-alert" role="status"><strong>일부 기관 조회 실패</strong>
      {failed.map(x=>LABEL[x.source]||x.source).join(' · ')} 데이터는 이번 요청에서 확인되지 않았습니다. 실제 습득물이 없다는 뜻은 아닙니다.</div>}
    {error&&<div className="lf-alert" role="alert"><strong>조회 오류</strong>{error}
      <div><button className="lf-more" onClick={()=>load(page||1, page===0)} type="button">다시 조회</button></div></div>}
    {loading?<div className="lf-state">경찰청 습득물 정보를 조회하고 있습니다…</div>:
      visible.length ? <div className="lf-grid">{visible.map(item=><button key={itemKey(item)} className="lf-card" onClick={()=>setSelected(item)}>
        <Photo src={item.image} title={item.title}/><div className="lf-card-body">
          <span className="lf-card-source">{LABEL[item.source]||'공식 API'} · {categoryOf(item)}</span>
          <strong>{item.title}</strong>
          <span className="lf-card-meta">습득일 {formatDate(item.date)}</span>
          <span className="lf-card-meta">보관 {item.place||'상세 확인 필요'}</span>
          <span className="lf-card-link">자세히 보기 ›</span>
        </div>
      </button>)}</div>:
      !error&&<div className="lf-state">{items.length>0?'현재 불러온 목록에는 검색어와 일치하는 물품이 없습니다. 다음 목록을 불러와 보세요.':
      '서울에서 조회된 습득물이 없습니다. 날짜 범위를 넓히거나 다른 기관을 선택해 보세요.'}</div>}
    {!loading&&more&&<button className="lf-more" disabled={loadingMore} onClick={()=>load(page+1,false)}>
      {loadingMore?'불러오는 중…':'다음 목록 불러오기 +'}
    </button>}
    {!loading&&<p className="lf-note">※ 서울특별시 습득지역 코드(LCA000)를 공식 API에 직접 전달합니다. 물품명·보관장소·분류 필터는 현재 불러온 목록에만 적용됩니다. 더 많은 항목을 확인하려면 ‘다음 목록 불러오기’를 눌러주세요. 조회 정보는 실제 보관·반환 상태와 다를 수 있으므로 수령 전 보관기관에 확인하세요.</p>}
    {selected&&<section className="lf-detail" aria-label="선택한 습득물 상세정보">
      <div className="lf-detail-head"><strong>습득물 상세정보</strong><button className="lf-close" onClick={()=>setSelected(null)} aria-label="상세정보 닫기">×</button></div>
      <dl className="lf-detail-grid">
        <dt>물품명</dt><dd>{selected.title}</dd>
        <dt>게시 내용</dt><dd>{selected.subject||'별도 내용 없음'}</dd>
        <dt>물품 분류</dt><dd>{selected.category||'미등록'}</dd>
        <dt>색상</dt><dd>{selected.color||'미등록'}</dd>
        <dt>습득일자</dt><dd>{formatDate(selected.date)}</dd>
        <dt>보관장소</dt><dd>{selected.place||'원본 데이터 확인 필요'}</dd>
        <dt>제공기관</dt><dd>{LABEL[selected.source]}</dd>
        <dt>관리번호</dt><dd>{selected.id||'미등록'}</dd>
      </dl>
      <a className="lf-detail-link" href="https://www.lost112.go.kr/" target="_blank" rel="noopener noreferrer">LOST112 공식 홈페이지에서 확인 ↗</a>
      <p className="lf-note">방문 전 관리번호를 이용해 해당 보관기관에 연락해 주세요. 연결된 링크는 개별 물품 상세 링크가 아닌 공식 홈페이지입니다.</p>
    </section>}
    <footer className="lf-footer">SUBWAY AI GUIDE · LOST112 PUBLIC API DEMO</footer>
  </div></div>;
}
