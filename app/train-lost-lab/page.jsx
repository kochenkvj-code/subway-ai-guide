import TrainLostFinder from '../v2/TrainLostFinder';

// Preview-only screen for validating the lost-train diagram before release.
// This route is committed on the isolated preview branch, not production.
export const metadata={title:'열차 내 유실물 · 배치도 테스트'};
export default function TrainLostLab(){
 return <main style={{maxWidth:760,margin:'0 auto',minHeight:'100dvh',background:'#f6f8fa'}}>
  <header style={{padding:'16px 16px 12px',background:'#fff',borderBottom:'1px solid #dbe7e4',fontFamily:'system-ui,sans-serif'}}>
   <div style={{display:'inline-block',fontSize:12,fontWeight:800,background:'#e0f3ec',color:'#046849',borderRadius:9,padding:'5px 9px'}}>TEST PAGE · 운영 미반영</div>
   <h1 style={{fontSize:20,color:'#174737',margin:'11px 0 7px'}}>열차 내 유실물 · 가로 배치도 테스트</h1>
   <p style={{fontSize:12,lineHeight:1.65,color:'#52706a',margin:'0 0 12px'}}>하차역 이후 역을 좌우 스크롤해 확인하고 후보 열차를 선택해 보세요. 실시간 모드에서는 실제 위치 API를 사용하지만 후보는 추정 정보입니다.</p>
   <nav style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <a href="?trainDemo=1" style={{fontSize:12,fontWeight:800,color:'#076b4e',border:'1px solid #b1d9c8',borderRadius:9,padding:'8px 12px',textDecoration:'none'}}>예시 데이터로 시험</a>
    <a href="?trainDemo=0" style={{fontSize:12,fontWeight:800,color:'#28516b',border:'1px solid #c8d8e6',borderRadius:9,padding:'8px 12px',textDecoration:'none'}}>실시간 API로 시험</a>
   </nav>
  </header>
  <TrainLostFinder lang="ko" active={true} defaultStation="종로5가" defaultLine="1"/>
 </main>;
}
