'use client';
import {useEffect,useState} from 'react';
const card={background:'#fff',padding:'18px',borderRadius:'16px',border:'1px solid #e1e7ef'};
export default function FacilityTest(){
  const [data,setData]=useState(null),[loading,setLoading]=useState(false);
  const load=async()=>{setLoading(true);try{const res=await fetch('/api/v2/facility-test');setData(await res.json());}catch(e){setData({ok:false,error:'FETCH_FAILED'});}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const dataPairs=(value)=>Object.entries(value||{}).filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([key,value])=>({key,value:typeof value==='object'?JSON.stringify(value):String(value)}));
  return <main style={{minHeight:'100vh',background:'#f3f6fb',color:'#192c48',fontFamily:'system-ui, sans-serif',padding:'24px 16px'}}>
    <div style={{maxWidth:860,margin:'auto',display:'grid',gap:16}}>
      <header><a href="/v2" style={{color:'#2859a4',textDecoration:'none'}}>← V2 메인으로</a><h1 style={{margin:'16px 0 6px',fontSize:24}}>종로5가역 시설 API 실제 데이터</h1><p style={{color:'#6c7c8e',fontSize:14}}>서울교통공사 편의시설위치정보 · 엘리베이터 조회 테스트 (읽기 전용)</p></header>
      <section style={card}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><strong>{loading?'조회 중…':data?.ok?'API 조회 성공':data?'API 확인 필요':'조회 준비 중'}</strong><button type="button" onClick={load} disabled={loading} style={{background:'#254d8f',color:'white',border:0,borderRadius:10,padding:'10px 15px'}}>다시 조회</button></div><p style={{fontSize:13,color:'#657489'}}>요청 조건: stnNm=종로5가 · lineNm=1호선 · getFcElvtr</p>{data&&<p style={{fontSize:14}}>응답 건수: <strong>{data.count??'—'}</strong> · 코드: <code>{data.resultCode||'미표시'}</code> {data.error&&'· 오류: '+data.error} {data.resultMessage&&'· '+data.resultMessage}</p>}</section>
      {data?.fieldNames?.length>0&&<section style={card}><h2 style={{fontSize:17}}>실제 반환된 필드명</h2><div style={{display:'flex',flexWrap:'wrap',gap:7}}>{data.fieldNames.map(x=><code key={x} style={{fontSize:12,background:'#eef3f9',padding:'5px 8px',borderRadius:8}}>{x}</code>)}</div></section>}
      {data?.items?.map((item,i)=><section key={i} style={card}><h2 style={{fontSize:17,margin:'0 0 14px'}}>시설 데이터 {i+1}</h2><dl style={{display:'grid',gridTemplateColumns:'minmax(110px,1fr) 2fr',gap:'10px 12px',margin:0,fontSize:13}}>{dataPairs(item).map(({key,value})=><div key={key} style={{display:'contents'}}><dt style={{color:'#64758b',overflowWrap:'anywhere'}}>{key}</dt><dd style={{margin:0,overflowWrap:'anywhere'}}>{value}</dd></div>)}</dl></section>)}
      {data&&(!data.items?.length)&&<section style={card}><h2 style={{fontSize:16}}>데이터 확인 결과</h2><p style={{fontSize:13,color:'#657489'}}>조회 결과가 비어 있거나 API 응답 오류가 발생했어. 아래 응답 구조로 요청 파라미터와 인증 상태를 진단할 수 있어.</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(data.rawStructure||data,null,2).slice(0,6000)}</pre></section>}
      <p style={{fontSize:12,color:'#68778d'}}>이 페이지는 서비스에 반영되지 않은 조사용 시안입니다. 실제 시설 위치는 API 원본값을 그대로 표시합니다. 인증키는 브라우저로 전달되지 않습니다.</p>
    </div>
  </main>;
}
