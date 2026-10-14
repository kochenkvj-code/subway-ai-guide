"use client";
import { useState } from "react";
export default function SubwayRouteTestPage() {
  const [results,setResults]=useState({});
  const [loading,setLoading]=useState("");
  async function run(id) {
    setLoading(id);
    try {
      const response=await fetch("/api/subway-route-test?case="+id,{cache:"no-store"});
      const result=await response.json();
      setResults(old=>({...old,[id]:result}));
    } catch(e) {setResults(old=>({...old,[id]:{ok:false,error:"테스트 요청에 실패했습니다."}}));}
    finally {setLoading("");}
  }
  const tests=[["gangnam","종로5가 → 강남 (2호선)"],["forest","종로5가 → 서울숲"]];
  return <main style={{maxWidth:780,margin:"40px auto",padding:20,fontFamily:"sans-serif",lineHeight:1.6}}>
    <h1>서울교통공사 역코드 호환성 테스트</h1>
    <p>기존 길찾기는 변경하지 않았습니다. 각 버튼은 동일 경로를 역명과 역코드로 각각 조회합니다.</p>
    {tests.map(([id,label])=><section key={id} style={{border:"1px solid #ccc",borderRadius:12,padding:16,marginBottom:18}}>
      <h2 style={{fontSize:18}}>{label}</h2>
      <button disabled={!!loading} onClick={()=>run(id)} style={{padding:"10px 16px",cursor:"pointer"}}>{loading===id?"검증 중...":"호환성 검사"}</button>
      {results[id]&&<div style={{marginTop:12}}>
        <strong>{results[id].compatible===true?"역명·역코드 조회 결과의 출발/도착역 일치":results[id].compatible===false?"불일치 또는 조회 실패":"테스트 오류"}</strong>
        <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",background:"#f4f4f4",color:"#111",padding:12,borderRadius:8,fontSize:12}}>{JSON.stringify(results[id],null,2)}</pre>
      </div>}
    </section>)}
    <p style={{fontSize:13,color:"#666"}}>결과가 일치해도 전체 799개 역코드의 호환성이 자동으로 보장되는 것은 아닙니다.</p>
  </main>;
}
