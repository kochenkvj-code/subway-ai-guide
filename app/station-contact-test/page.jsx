'use client';
import {useEffect,useState} from 'react';
const format=v=>{const s=String(v||'').replace(/\D/g,'');return s.startsWith('02')&&s.length===10?'02-'+s.slice(2,6)+'-'+s.slice(6):v||'미제공'};
export default function StationContactTest(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 useEffect(()=>{let mounted=true;fetch('/api/v2/station-contact-test',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'조회 실패');if(mounted)setData(d)}).catch(e=>{if(mounted)setError(e.message)}).finally(()=>{if(mounted)setBusy(false)});return()=>{mounted=false}},[]);
 return <main style={{background:'#f4f7f9',minHeight:'100dvh',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif',color:'#203b4b',padding:'24px 14px'}}>
 <div style={{maxWidth:740,margin:'0 auto'}}>
 <p style={{fontSize:11,fontWeight:800,letterSpacing:2,color:'#337e84'}}>STATION CONTACT API TEST</p>
 <h1 style={{fontSize:25,letterSpacing:-1,margin:'6px 0'}}>9호선 13개 역 연락처 조회</h1>
 <p style={{fontSize:13,color:'#657f8b',lineHeight:1.65}}>운영용 시설 메뉴를 수정하지 않는 읽기 전용 시험 화면입니다. 전화번호와 주소는 원천 API의 실제 반환값만 표시합니다.</p>
 {busy&&<div style={{background:'white',padding:20,borderRadius:12}}>역별 주소·전화번호 API를 조회하고 있습니다…</div>}
 {error&&<div style={{background:'#fff3ec',color:'#9a3f2b',padding:20,borderRadius:12}}><strong>API 조회 실패</strong><p style={{marginBottom:0}}>{error==='KEY_NOT_CONFIGURED'?'Production 키가 설정되지 않았습니다.':error==='KEY_OR_PERMISSION_REJECTED'?'등록된 키가 서울 열린데이터광장 API에서 허용되지 않았습니다. 발급처와 인증 방식을 확인하세요.':'API 호출 또는 응답이 실패했습니다 ('+error+').'}</p></div>}
 {data&&<>
 <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,margin:'20px 0'}}>
 {[[ '조회 성공',data.matched],[ '조회 실패',13-data.matched],[ '원천 전체 응답',data.loaded]].map(([label,value])=><div key={label} style={{background:'#fff',border:'1px solid #e1e9ed',borderRadius:12,padding:15}}><small style={{fontSize:10,color:'#778e9a'}}>{label}</small><div style={{fontWeight:850,fontSize:24,marginTop:4}}>{value}</div></div>)}</div>
 <p style={{fontSize:11,color:'#78909c'}}>출처: {data.source} · 원천 전체 건수 {data.sourceTotal} · 갱신 {new Date(data.fetchedAt).toLocaleString('ko-KR')}</p>
 <div style={{display:'grid',gap:9}}>{data.stations.map(s=><section key={s.code} style={{background:'#fff',border:'1px solid #e1e8ef',padding:17,borderRadius:13}}>
 <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><strong>{s.name} <small style={{fontWeight:500,color:'#8394a0'}}>9호선 · {s.code}</small></strong><span style={{fontSize:11,color:s.found?'#168264':'#bf5842',fontWeight:800}}>{s.found?'원천 조회 성공':'기록 없음'}</span></div>
 {s.records.map((r,i)=><div key={i} style={{marginTop:12,display:'grid',gap:9,fontSize:13}}>
 <div><small style={{display:'block',color:'#8497a2',fontSize:10,marginBottom:4}}>역 대표전화</small><strong>{format(r.phone)}</strong></div>
 <div><small style={{display:'block',color:'#8497a2',fontSize:10,marginBottom:4}}>도로명 주소</small>{r.roadAddress||'미제공'}</div>
 {r.oldAddress&&<div><small style={{display:'block',color:'#8497a2',fontSize:10,marginBottom:4}}>지번 주소</small>{r.oldAddress}</div>}
 </div>)}</section>)}</div>
 </>}
 <p style={{fontSize:11,color:'#8699a6',marginTop:22}}>해당 정보는 역 대표번호·주소이며 고객안전실의 정확한 층수 또는 내부 위치가 아닙니다.</p>
 </div></main>
}