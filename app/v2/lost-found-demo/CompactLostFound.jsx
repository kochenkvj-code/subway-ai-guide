'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import './compact.css';

const sourceLabel={portal:'공공기관',police:'경찰관서'};
function localDate(daysBack=0){
  const now=new Date(Date.now()+9*3600000-daysBack*86400000);
  return now.toISOString().slice(0,10);
}
function dateISO(raw){
  const value=String(raw||'').replace(/[^\d]/g,'');
  return value.length===8?value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8):'';
}
function displayDate(raw){return dateISO(raw).replace(/-/g,'.')||'미등록';}
function recordKey(item){return [item.source,item.id,item.sequence,item.date,item.title].join('|');}
function categoryName(item){return String(item.category||'기타').split(/[>＞]/)[0].trim()||'기타';}
function dedupe(items){
  const seen=new Set();
  return items.filter(item=>{const k=recordKey(item);if(seen.has(k))return false;seen.add(k);return true;})
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function Photo({src,title}){
  const [error,setError]=useState(false);
  useEffect(()=>setError(false),[src]);
  return <div className="lf-thumb">{src&&!error?
    <img src={src} alt={title+' 습득물 사진'} loading="lazy" referrerPolicy="no-referrer" onError={()=>setError(true)}/>:
    <div className="lf-no-image"><span>▧</span>사진 없음</div>}</div>;
}

export default function CompactLostFound(){
  const [place,setPlace]=useState('');
  const [itemName,setItemName]=useState('');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [items,setItems]=useState([]);
  const [category,setCategory]=useState('전체');
  const [mode,setMode]=useState('area-date');
  const [appliedDates,setAppliedDates]=useState(null);
  const [pageSize,setPageSize]=useState(5);
  const [screenPage,setScreenPage]=useState(0);
  const [remotePage,setRemotePage]=useState(0);
  const [hasMore,setHasMore]=useState(false);
  const [errors,setErrors]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [warning,setWarning]=useState('');
  const [message,setMessage]=useState('');
  const [selected,setSelected]=useState(null);
  const [detail,setDetail]=useState(null);
  const [detailLoading,setDetailLoading]=useState(false);
  const [detailError,setDetailError]=useState(false);
  const searchRef=useRef(null);
  const counter=useRef(0);
  const detailRef=useRef(null);

  async function queryRecords(remote=1,replace=true,filters=null,signal=null){
    const active=filters||searchRef.current;
    if(!active)return null;
    const ticket=++counter.current;
    if(replace){setLoading(true);setWarning('');setMessage('');setItems([]);setSelected(null);setScreenPage(0);setCategory('전체');setRemotePage(0);}
    else {setLoadingMore(true);setWarning('');setMessage('');}
    try{
      const p=new URLSearchParams({
        source:'both',page:String(remote),
        start:active.start||localDate(90),end:active.end||localDate(),
      });
      if(active.item)p.set('item',active.item);
      if(active.place)p.set('place',active.place);
      const response=await fetch('/api/v2/lost-found?'+p.toString(),{cache:'no-store',signal});
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||'SEARCH_FAILED');
      if(signal?.aborted||counter.current!==ticket)return null;
      const incoming=data.items||[];
      setItems(prev=>dedupe(replace?incoming:[...prev,...incoming]));
      setMode(data.searchMode||'area-date');
      setAppliedDates({from:active.displayFrom,to:active.displayTo});
      setErrors(data.errors||[]);
      setRemotePage(remote);
      setHasMore(Boolean(data.hasMore));
      return {data,incoming};
    }catch(e){
      if(signal?.aborted||counter.current!==ticket)return null;
      setWarning(e?.message==='API_KEY_MISSING'
        ?'경찰청 API 환경변수가 설정되지 않았습니다.'
        :'습득물 정보를 불러오지 못했습니다. API 연결 또는 활용승인을 확인해 주세요.');
      return null;
    }finally{
      if(counter.current===ticket&&!signal?.aborted){setLoading(false);setLoadingMore(false);}
    }
  }
  useEffect(()=>{
    const controller=new AbortController();
    const f={place:'',item:'',start:localDate(90),end:localDate(),displayFrom:'',displayTo:''};
    searchRef.current=f;
    queryRecords(1,true,f,controller.signal);
    return ()=>controller.abort();
  },[]);

  function submit(e){
    e?.preventDefault();
    const p=place.trim(),it=itemName.trim();
    if((p&&p.length<2)||(it&&it.length<2)){setWarning('보관장소와 물품명은 두 글자 이상 입력해 주세요.');return;}
    if((from&&!to)||(!from&&to)){setWarning('기간을 지정하려면 시작일과 종료일을 모두 입력해 주세요.');return;}
    if(from&&to&&from>to){setWarning('시작일은 종료일보다 늦을 수 없습니다.');return;}
    if(from&&to&&!p&&!it&&(Date.parse(to)-Date.parse(from))/86400000>90){
      setWarning('서울 지역·기간 조회 API는 최대 90일까지 조회할 수 있습니다.');return;
    }
    const named=Boolean(p||it);
    // The official name/place endpoint has no date params. Range is an optional local filter.
    const f={place:p,item:it,start:from||(named?'':localDate(90)),
      end:to||(named?'':localDate()),displayFrom:from,displayTo:to};
    searchRef.current=f;
    queryRecords(1,true,f);
  }

  const categories=useMemo(()=>{
    const names=Array.from(new Set(items.map(categoryName))).sort((a,b)=>a.localeCompare(b,'ko'));
    return ['전체',...names];
  },[items]);

  function match(item){
    if(category!=='전체'&&categoryName(item)!==category)return false;
    if(mode==='name-place'&&appliedDates?.from&&appliedDates?.to){
      const found=dateISO(item.date);
      if(!found||found<appliedDates.from||found>appliedDates.to)return false;
    }
    return true;
  }
  const visible=useMemo(()=>items.filter(match),[items,category,mode,appliedDates]);
  const maxPage=Math.max(1,Math.ceil(visible.length/pageSize));
  const safePage=Math.min(screenPage,maxPage-1);
  const pageItems=visible.slice(safePage*pageSize,(safePage+1)*pageSize);

  function pick(item){setSelected(item);}
  useEffect(()=>{
    if(!selected)return;
    detailRef.current?.scrollIntoView({block:'nearest',behavior:'smooth'});
    setDetail(null);setDetailError(false);setDetailLoading(false);
    if(!selected.id||!/^\d{1,5}$/.test(String(selected.sequence||''))){
      setDetailError(true);return;
    }
    const controller=new AbortController();
    setDetailLoading(true);
    const p=new URLSearchParams({source:selected.source,id:selected.id,sequence:String(selected.sequence)});
    fetch('/api/v2/lost-found/detail?'+p.toString(),{signal:controller.signal,cache:'no-store'})
      .then(async r=>{const data=await r.json();if(!r.ok||!data.ok)throw Error('DETAIL_FAILED');return data.detail;})
      .then(data=>{if(!controller.signal.aborted)setDetail(data);})
      .catch(()=>{if(!controller.signal.aborted)setDetailError(true);})
      .finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});
    return ()=>controller.abort();
  },[selected]);

  async function next(){
    if(loading||loadingMore)return;
    if((safePage+1)*pageSize<visible.length){
      setScreenPage(safePage+1);setSelected(null);return;
    }
    if(!hasMore)return;
    const before=visible.length;
    const result=await queryRecords(remotePage+1,false);
    if(!result)return;
    const merged=dedupe([...items,...result.incoming]);
    const moreVisible=merged.filter(match).length;
    if(moreVisible>before)setScreenPage(safePage+1);
    else setMessage('다음 목록을 조회했지만 현재 분류·기간에 맞는 물품이 추가되지 않았습니다. 필요하면 다음을 다시 눌러주세요.');
    setSelected(null);
  }
  const nextAllowed=(safePage+1)*pageSize<visible.length||hasMore;
  return <main className="lf-page"><div className="lf-shell">
    <header className="lf-top">
      <button className="lf-back" aria-label="챗봇으로 돌아가기" onClick={()=>window.location.assign('/v2')}>‹</button>
      <div className="lf-top-title">습득물 검색</div>
      <div className="lf-top-note">LOST112 · 서울 중심</div>
    </header>
    <form className="lf-search" onSubmit={submit}>
      <div className="lf-search-grid">
        <label className="lf-field">보관장소
          <input type="search" value={place} maxLength={80} placeholder="예: 종로5가역, 유실물센터" onChange={e=>setPlace(e.target.value)}/>
        </label>
        <label className="lf-field">물품명
          <input type="search" value={itemName} maxLength={80} placeholder="예: 지갑, 휴대폰, 가방" onChange={e=>setItemName(e.target.value)}/>
        </label>
        <div className="lf-date-head">기간 설정 <button className="lf-clear-date" type="button" onClick={()=>{setFrom('');setTo('');}}>기간 초기화</button></div>
        <div className="lf-date-row">
          <label className="lf-field">시작일<input type="date" value={from} max={to||localDate()} onChange={e=>setFrom(e.target.value)}/></label>
          <label className="lf-field">종료일<input type="date" value={to} min={from||undefined} max={localDate()} onChange={e=>setTo(e.target.value)}/></label>
        </div>
      </div>
      <div className="lf-actions">
        <span className="lf-hint">입력 없이 조회하면 서울 최근 90일을 검색합니다.</span>
        <button className="lf-submit" type="submit" disabled={loading||loadingMore}>{loading?'조회 중…':'조회하기 →'}</button>
      </div>
    </form>

    <section className="lf-results" aria-label="습득물 검색 결과">
      <div className="lf-results-head">
        <h2 className="lf-results-title">조회 결과</h2>
        <span className="lf-results-count">{loading?'불러오는 중…':visible.length+'건 표시 / '+items.length+'건 불러옴'}</span>
      </div>
      {items.length>0&&<div className="lf-chips" aria-label="물품 분류">
        {categories.map(cat=><button className={'lf-chip'+(category===cat?' selected':'')} aria-pressed={category===cat} key={cat} onClick={()=>{setCategory(cat);setScreenPage(0);setSelected(null);}} type="button">{cat}</button>)}
      </div>}
      {errors.length>0&&<div className="lf-warning" role="status">{errors.map(x=>sourceLabel[x.source]||x.source).join(' · ')} 조회에 실패했습니다. 해당 기관의 검색 결과는 확인되지 않았습니다.</div>}
      {warning&&<div className="lf-warning" role="alert">{warning} <button type="button" onClick={()=>submit()}>다시 조회</button></div>}
      {message&&<div className="lf-warning" role="status">{message}</div>}
      {loading?<div className="lf-state">서울 습득물 정보를 조회 중입니다…</div>:
       pageItems.length?<div className="lf-list">{pageItems.map(item=>
        <button className={'lf-item'+(selected&&recordKey(selected)===recordKey(item)?' selected':'')} type="button"
          key={recordKey(item)} onClick={()=>pick(item)} aria-label={item.title+' 자세히 보기'}>
          <Photo src={item.image} title={item.title}/>
          <div className="lf-item-main">
            <span className="lf-item-title">{item.title}</span>
            <span className="lf-item-meta">{displayDate(item.date)} · {sourceLabel[item.source]||'기관'}</span>
            <span className="lf-item-meta">보관: {item.place||'확인 필요'}</span>
          </div><span className="lf-item-chevron">›</span>
        </button>
       )}</div>:
       <div className="lf-state">{items.length?'현재 분류·기간 조건에 해당하는 목록이 없습니다.':
         mode==='name-place'?'입력한 물품명 또는 보관장소의 검색 결과가 없습니다. 습득장소와 보관장소는 서로 다를 수 있어요.':
         '조회된 습득물이 없습니다. 조건을 변경해 다시 검색해 보세요.'}</div>}
      {!loading&&<div className="lf-pager">
        <button type="button" disabled={safePage===0||loadingMore} onClick={()=>{setScreenPage(n=>Math.max(0,n-1));setSelected(null);}}>‹ 이전</button>
        <div className="lf-pager-center">
          <span>{safePage+1} / {maxPage}{hasMore?'+':''} 페이지</span>
          <select className="lf-size-select" aria-label="페이지당 표시 건수" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setScreenPage(0);setSelected(null);}}>
            <option value={5}>5개씩</option><option value={10}>10개씩</option>
          </select>
        </div>
        <button type="button" disabled={!nextAllowed||loadingMore} onClick={next}>{loadingMore?'불러오는 중…':'다음 ›'}</button>
      </div>}
      <p className="lf-bottom">
        {mode==='name-place'?'장소·물품명 직접 검색은 기관 API 특성상 서울·기간 조건을 함께 지정할 수 없습니다.':''}
        {mode==='name-place'&&appliedDates?.from&&appliedDates?.to?' 기간 필터는 현재 불러온 검색 결과에만 적용됩니다.':''}
        {mode==='area-date'?'서울 습득지역의 최근 90일 또는 지정 기간 목록입니다.':''}
        {' '}습득장소와 보관장소는 다를 수 있습니다.
      </p>
    </section>

    {selected&&<section className="lf-detail" ref={detailRef} aria-label="선택한 습득물 상세정보">
      <div className="lf-detail-head"><strong>습득물 상세정보</strong>
        <button type="button" className="lf-detail-close" onClick={()=>setSelected(null)} aria-label="상세 닫기">×</button>
      </div>
      <div className="lf-detail-content">
        <div className="lf-detail-summary">
          <Photo src={detail?.image||selected.image} title={detail?.title||selected.title}/>
          <div><h3>{detail?.title||selected.title}</h3>
            <p>{sourceLabel[selected.source]||'공식기관'} · {categoryName(selected)}</p>
            <p>{displayDate(detail?.date||selected.date)}</p>
          </div>
        </div>
        {detailLoading&&<p className="lf-detail-more">공식 API에서 상세정보를 불러오는 중입니다…</p>}
        {detailError&&<p className="lf-detail-more">추가 상세정보를 가져오지 못했습니다. 아래는 목록에서 확인된 정보입니다.</p>}
        <dl className="lf-detail-fields">
          <dt>물품명</dt><dd>{detail?.title||selected.title}</dd>
          <dt>분류</dt><dd>{detail?.category||selected.category||'미등록'}</dd>
          <dt>색상</dt><dd>{selected.color||'미등록'}</dd>
          <dt>습득일</dt><dd>{displayDate(detail?.date||selected.date)}</dd>
          {detail?.foundPlace&&<><dt>습득장소</dt><dd>{detail.foundPlace}</dd></>}
          {detail?.foundHour&&<><dt>습득시각</dt><dd>{detail.foundHour}</dd></>}
          <dt>보관장소</dt><dd>{detail?.place||selected.place||'미등록'}</dd>
          {detail?.custody&&<><dt>보관상태</dt><dd>{detail.custody}</dd></>}
          {detail?.organization&&<><dt>보관기관</dt><dd>{detail.organization}</dd></>}
          {detail?.phone&&<><dt>문의전화</dt><dd><a href={'tel:'+detail.phone.replace(/[^\d+]/g,'')}>{detail.phone}</a></dd></>}
          <dt>관리번호</dt><dd>{selected.id||'미등록'}{selected.sequence?' / '+selected.sequence:''}</dd>
          {detail?.note&&<><dt>특이사항</dt><dd>{detail.note}</dd></>}
          {!detail?.note&&selected.subject&&<><dt>게시내용</dt><dd>{selected.subject}</dd></>}
        </dl>
        <a className="lf-detail-link" href="https://www.lost112.go.kr/" target="_blank" rel="noopener noreferrer">LOST112 공식 홈페이지에서 확인 ↗</a>
        <p className="lf-bottom">방문 전 해당 기관에 보관 여부를 문의해 주세요. 위 링크는 개별 물품이 아닌 공식 홈페이지로 연결됩니다.</p>
      </div>
    </section>}
    <footer className="lf-footer">SUBWAY AI GUIDE · LOST112 PUBLIC DATA</footer>
  </div></main>;
}
