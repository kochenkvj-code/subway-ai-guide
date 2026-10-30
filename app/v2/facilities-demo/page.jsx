'use client';
import { useEffect, useState } from 'react';
const TYPES=[
 ['elevator','엘리베이터','↕','이동·접근성',true],
 ['toilet','화장실','WC','기본 편의'],
 ['escalator','에스컬레이터','↗','이동·접근성'],
 ['locker','물품보관함','▣','기본 편의'],
 ['office','고객안전실','ⓘ','안내·서비스'],
 ['ticket','승차권 발매기','▤','안내·서비스'],
 ['nursing','수유실','♡','기본 편의'],
 ['atm','ATM','₩','기본 편의'],
 ['civil','무인민원발급기','▧','안내·서비스'],
 ['parcel','무인택배보관함','▥','기본 편의'],
 ['bike','자전거보관함','◎','기본 편의'],
 ['lostoffice','유실물보관소','◇','안내·서비스'],
 ['parking','환승주차장','P','이동·접근성'],
 ['culture','문화시설','✦','안내·서비스'],
 ['book','도서판매대','▦','안내·서비스']
];
const present=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
function pick(o,patterns){
 for(const pattern of patterns){const row=Object.entries(o||{}).find(([k,v])=>pattern.test(k)&&present(v)&&typeof v!=='object');if(row)return String(row[1]);}
 return '';
}
function info(row,i){
 const name=pick(row,[/elvtrNm|fcltNm|faclNm/i,/시설명|승강기명|엘리베이터명/i,/elvtrNo/i])||'엘리베이터 '+(i+1);
 const location=pick(row,[/instl.*(pstn|loc|plc)/i,/설치.*위치/i,/lctn|location|position|pstn|plc/i,/위치/i]);
 const status=pick(row,[/oper.*(st|yn)|opr.*st|run.*st|status/i,/운영|가동/i]);
 const floor=pick(row,[/floor|flr|연결층|운행층/i]);
 return {name,location,status,floor};
}
const css='.out{background:#e9eff6;min-height:100vh;padding:22px 12px;font-family:Arial,"Noto Sans KR",sans-serif;color:#1b304d}.phone{max-width:475px;min-height:calc(100vh - 44px);margin:auto;background:#f7f9fc;border-radius:24px;box-shadow:0 17px 60px #21416a18;overflow:hidden}.nav{display:flex;align-items:center;gap:12px;padding:16px 20px;background:#fff;border-bottom:1px solid #e7edf3}.back{width:36px;height:36px;border:0;border-radius:11px;background:#f0f4fa;font-size:24px;color:#315c8e;cursor:pointer}.navtitle{font-size:15px;font-weight:750;flex:1}.navtitle small{color:#93a0b0;font-weight:400}.station{font-size:10px;color:#577297;background:#eff4fc;padding:8px;border-radius:10px;white-space:nowrap}.station b{background:#2c5c9f;color:white;border-radius:50%;padding:3px 6px}.main{padding:25px 20px 35px;min-height:600px}.eyebrow{font-size:9px;color:#648bb9;letter-spacing:1.5px;font-weight:800}.heading{margin:9px 0;font-size:25px;line-height:1.35;letter-spacing:-1px}.muted{color:#8191a5;font-size:12px;line-height:1.8}.search{width:100%;padding:15px;margin-top:19px;background:white;border:1px solid #e0e8f0;border-radius:13px;font-size:13px;color:#1f3650;box-sizing:border-box}.sec{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:24px 0 12px}.sec strong{font-size:16px}.sec small{font-size:10px;color:#91a0b2}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tile{display:flex;gap:9px;align-items:center;text-align:left;min-width:0;padding:11px 9px;min-height:76px;background:#fff;border:1px solid #e3ebf3;border-radius:15px;cursor:pointer;color:#304960}.tile:focus-visible,.record:focus-visible{outline:3px solid #8eacd3}.sym{display:grid;place-items:center;flex:none;width:33px;height:33px;border-radius:10px;background:#edf3fb;color:#3669a7;font-size:16px;font-weight:800}.tile .copy{flex:1;display:flex;min-width:0;flex-direction:column;gap:6px}.tile strong{font-size:12px;line-height:1.3;word-break:keep-all}.tile small{color:#8a9cae;font-size:10px}.chev{color:#97a6b9;font-size:20px}.more{width:100%;padding:14px;border:0;background:none;color:#4e72a0;font-weight:700;font-size:12px;cursor:pointer}.note{display:flex;gap:9px;padding:15px;margin-top:14px;border-radius:13px;background:#eef3f9;color:#657a94;font-size:11px;line-height:1.7}.note b{color:#365576}.crumb{color:#8293a9;font-size:11px;margin-bottom:16px}.headingrow{display:flex;gap:14px;align-items:center;margin-bottom:20px}.bigicon{width:54px;height:54px;background:#e8f0fb;border-radius:17px;display:grid;place-items:center;font-size:25px;color:#315f9d;flex:none}.headingrow h1{font-size:22px;margin:6px 0;line-height:1.4}.record{width:100%;border:1px solid #e1e8f0;border-radius:15px;background:#fff;display:flex;gap:13px;padding:16px;text-align:left;align-items:center;margin-bottom:9px;cursor:pointer;color:#243b57}.num{padding:10px;border-radius:10px;background:#eef4fc;color:#2c67ae;font-weight:700;font-size:11px}.record .copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}.record strong{font-size:13px}.record small{font-size:11px;color:#70849b;line-height:1.6;overflow-wrap:anywhere}.primary{background:linear-gradient(120deg,#193c5f,#275683);border-radius:17px;padding:20px;color:#fff;margin-bottom:12px}.primary small{color:#bed8f2;font-size:12px}.primary p{font-size:17px;line-height:1.75;font-weight:750;overflow-wrap:anywhere;margin:12px 0 0}.panel{background:#fff;border:1px solid #e3e9f1;border-radius:15px;padding:16px;margin:12px 0}.panel strong{font-size:13px}.panel p{font-size:12px;color:#788a9e;line-height:1.8}.panel button{background:none;border:0;color:#285d9c;font-weight:700;font-size:12px;padding:8px 0;cursor:pointer}.guide{background:#f1f5fa;padding:13px;border-radius:11px;color:#425a75;font-size:12px;line-height:1.9}.rawline{display:grid;grid-template-columns:1fr 1.4fr;gap:8px;border-top:1px solid #edf0f5;padding:11px 0;font-size:11px;line-height:1.7;overflow-wrap:anywhere}.rawline span:first-child{color:#74879e}.empty{text-align:center;padding:26px 15px;background:#fff;border:1px dashed #d7e1ed;border-radius:15px;color:#78899e;font-size:12px;line-height:1.9}.refresh{border:0;background:none;color:#4e72a3;font-size:11px;cursor:pointer}.return{margin-top:20px;padding:14px;width:100%;background:#fff;border:1px solid #d7e2ef;border-radius:12px;color:#315e8f;font-weight:700;font-size:12px;cursor:pointer}.footer{text-align:center;border-top:1px solid #e8edf3;padding:19px;color:#98a9ba;font-size:10px;letter-spacing:1px}@media(max-width:500px){.out{padding:0}.phone{border-radius:0;box-shadow:none;min-height:100dvh}.main{min-height:calc(100dvh - 135px)}}@media(max-width:360px){.main{padding:20px 14px}.tile{gap:6px;padding:10px 6px}.tile strong{font-size:11px}.tile small{font-size:9px}}';
export const dynamic='force-dynamic';
export default function FacilityDemo(){
 const [type,setType]=useState(null),[index,setIndex]=useState(null),[raw,setRaw]=useState(false),[guide,setGuide]=useState(false),[more,setMore]=useState(false),[q,setQ]=useState(''),[data,setData]=useState(null),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const r=await fetch('/api/v2/facility-test',{cache:'no-store'});setData(await r.json());}catch{setData({ok:false,error:'NETWORK'});}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 const rows=data?.ok&&Array.isArray(data.items)?data.items:[];
 const picked=TYPES.find(x=>x[0]===type);
 const row=index===null?null:rows[index];
 const summary=row?info(row,index):null;
 function back(){if(index!==null){setIndex(null);setRaw(false);setGuide(false);}else setType(null);}
 const visible=TYPES.filter(x=>!q||x[1].toLowerCase().includes(q.toLowerCase())).slice(0,q||more?15:8);
 return <div className="out"><style>{css}</style><div className="phone">
  <header className="nav"><button className="back" aria-label="뒤로 가기" onClick={()=>type?back():window.location.assign('/v2')}>‹</button><div className="navtitle">시설안내 <small>· 데모</small></div><div className="station"><b>1</b> 종로5가역</div></header>
  <main className="main">
  {!type?<><div className="eyebrow">STATION FACILITIES</div><h1 className="heading">필요한 시설을<br/>쉽게 찾아보세요.</h1><p className="muted">종로5가역의 편의시설과 설치 위치를 확인해 보세요.</p>
   <input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="🔎  어떤 시설을 찾으세요?" aria-label="시설 검색"/>
   <div className="sec"><strong>시설 종류</strong><small>서울교통공사 공공데이터</small></div>
   <div className="grid">{visible.map(x=><button className="tile" key={x[0]} onClick={()=>{setType(x[0]);setIndex(null);setGuide(false);setRaw(false);}}><span className="sym">{x[2]}</span><span className="copy"><strong>{x[1]}</strong><small>{x[4]?(loading?'조회 중':data?.ok?rows.length+'건 조회됨':'조회 확인 필요'):'추가 연동 예정'}</small></span><span className="chev">›</span></button>)}</div>
   {!q&&<button className="more" onClick={()=>setMore(!more)}>{more?'주요 시설만 보기':'전체 15개 시설 종류 보기'} {more?'−':'＋'}</button>}
   <div className="note">ⓘ <div><b>시설안내 화면 흐름 데모</b><br/>현재 엘리베이터만 실제 API 데이터에 연결되어 있습니다. 다른 항목들은 화면 구성을 확인하기 위한 시설 유형이며, 종로5가역에 실제 설치돼 있다는 뜻은 아닙니다.</div></div>
  </>:index!==null&&row?<><div className="crumb">종로5가역 › {picked[1]} › 상세</div><div className="headingrow"><div className="bigicon">{picked[2]}</div><div><div className="eyebrow">FACILITY DETAILS</div><h1>{summary.name}</h1><p className="muted">서울교통공사 API 원본 정보</p></div></div>
   <section className="primary"><small>⌖ &nbsp; 설치 위치</small><p>{summary.location||'원본에서 위치 설명을 자동 식별하지 못했어요.'}</p></section>
   {summary.status&&<section className="panel"><strong>운영 관련 표기</strong><p>{summary.status}</p></section>}
   <section className="panel"><strong>✦ 위치 안내 미리보기</strong><p>추후 AI 안내와 연결할 자리입니다. 지금은 실제 공공데이터만 활용해 문구를 만들어 봅니다.</p><button onClick={()=>setGuide(!guide)}>{guide?'안내 접기':'안내문구 보기'} ›</button>{guide&&<div className="guide">종로5가역의 {picked[1]} 정보를 확인했어요. {summary.location?'공공데이터에 기재된 설치 위치는 “'+summary.location+'”입니다.':'현재 원본에서 명확한 설치 위치를 확인하지 못했습니다.'} {summary.status?'운영 관련 표기는 “'+summary.status+'”입니다.':''} 정확한 이동 경로는 추가 검증이 필요해요.</div>}</section>
   <section className="panel"><button onClick={()=>setRaw(!raw)}>API 원본 필드 {raw?'접기':'모두 보기'} {raw?'−':'＋'}</button>{raw&&Object.entries(row).map(([k,v])=><div key={k} className="rawline"><span>{k}</span><span>{v===null?'—':typeof v==='object'?JSON.stringify(v):String(v)}</span></div>)}</section>
   <button className="return" onClick={back}>이전 목록으로</button>
  </>:<><div className="crumb">종로5가역 › 시설안내</div><div className="headingrow"><div className="bigicon">{picked?.[2]}</div><div><div className="eyebrow">STATION FACILITIES</div><h1>{picked?.[1]}</h1><p className="muted">{picked?.[3]}</p></div></div>
   {type==='elevator'?<><div className="sec"><strong>실제 설치 위치 조회</strong><button className="refresh" onClick={load} disabled={loading}>↻ 다시 조회</button></div>{loading?<div className="empty">공공데이터 조회 중…</div>:!data?.ok?<div className="empty">조회 오류가 발생했습니다.<br/><a href="/v2/facility-test">기존 원본 테스트 페이지에서 확인</a></div>:rows.length===0?<div className="empty">조회된 엘리베이터 정보가 없습니다. 실제 미설치 여부를 뜻하지는 않습니다.</div>:rows.map((r,i)=>{const s=info(r,i);return <button className="record" key={i} onClick={()=>setIndex(i)}><span className="num">{String(i+1).padStart(2,'0')}</span><span className="copy"><strong>{s.name}</strong><small>{s.location||'위치 안내 · 상세 보기'}</small>{s.status&&<small>운영 표기: {s.status}</small>}</span><span className="chev">›</span></button>})}<p className="muted">출처: 서울교통공사 편의시설위치정보 API · 종로5가역 · 엘리베이터</p></>:<div className="panel"><strong>이 시설의 상세 화면은 다음 단계에서 연결해요.</strong><p>{picked?.[1]}의 실제 조회 API가 연결되면 종로5가역에 등록된 개별 설치 위치가 목록으로 나타나고, 선택하면 위치·운영정보를 확인하는 구조입니다.</p><div className="guide">시설 종류 선택 → 설치 위치 목록 → 상세 위치 안내</div><p style={{fontSize:11,color:'#aa8464'}}>※ 이 항목의 실제 설치 여부나 위치는 아직 조회·검증하지 않았어요.</p></div>}
   <button className="return" onClick={back}>다른 시설 선택하기</button>
  </>}
  </main><footer className="footer">SUBWAY AI GUIDE · FACILITIES DEMO</footer></div></div>;
}
