import TrainLostFinder from '../v2/TrainLostFinder';
import {redirect} from 'next/navigation';

export const metadata={title:'열차 내 유실물 찾기 · UX 테스트'};

export default async function TrainLostLab({searchParams}){
 const params=await searchParams;
 const lang=params?.lang==='en'?'en':'ko';
 const mode=params?.trainDemo;
 if(mode!=='0'&&mode!=='1')redirect('/train-lost-lab?trainDemo=1&lang='+lang);
 const demo=mode==='1';
 const t=lang==='en'?{
  title:'Lost-on-train · UX preview',subtitle:'Try all three steps, candidate selection and the handoff message.',
  ko:'한국어',en:'English',sample:'Sample trains',live:'Live API',
  notice:'Example details are prefilled for easier testing. This page never sends an SMS.'
 }:{
  title:'열차 내 유실물 찾기 · UX 테스트',subtitle:'3단계 입력·열차 확인·문자 접수 흐름을 직접 비교해 보세요.',
  ko:'한국어',en:'English',sample:'예시 열차',live:'실시간 API',
  notice:'입력 예시가 미리 채워져 있습니다. 이 테스트페이지에서는 실제 접수 문자가 발송되지 않습니다.'
 };
 const url=(l,m)=>'/train-lost-lab?trainDemo='+m+'&lang='+l;
 const linkStyle=(selected)=>({display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:34,padding:'6px 12px',borderRadius:9,fontSize:12,fontWeight:800,textDecoration:'none',background:selected?'#e0f4ed':'#fff',color:selected?'#076b50':'#4c6470',border:selected?'1px solid #30a182':'1px solid #cfdfe3'});
 return <main style={{maxWidth:760,minHeight:'100dvh',margin:'0 auto',background:'#f6f8fa',fontFamily:'system-ui,-apple-system,sans-serif'}}>
  <header style={{padding:'15px 14px 13px',borderBottom:'1px solid #dbe7e7',background:'#fff'}}>
   <span style={{display:'inline-block',fontSize:11,fontWeight:900,letterSpacing:'.3px',borderRadius:8,background:'#fff0d5',color:'#896018',padding:'5px 9px'}}>PREVIEW ONLY · 운영 미반영</span>
   <h1 style={{fontSize:19,color:'#183f4c',margin:'9px 0 4px',letterSpacing:'-.3px'}}>{t.title}</h1>
   <p style={{fontSize:12,lineHeight:1.5,color:'#65818a',margin:'0 0 10px'}}>{t.subtitle}</p>
   <div style={{display:'flex',flexWrap:'wrap',gap:7,alignItems:'center',marginBottom:9}}>
    <a href={url('ko',mode)} style={linkStyle(lang==='ko')}>{t.ko}</a>
    <a href={url('en',mode)} style={linkStyle(lang==='en')}>{t.en}</a>
    <span style={{width:1,height:25,background:'#dce8e9',margin:'0 3px'}}/>
    <a href={url(lang,'1')} style={linkStyle(demo)}>{t.sample}</a>
    <a href={url(lang,'0')} style={linkStyle(!demo)}>{t.live}</a>
   </div>
   <p style={{fontSize:11,lineHeight:1.45,margin:0,color:'#8b6730'}}>{t.notice}</p>
  </header>
  <TrainLostFinder key={lang+'-'+mode} lang={lang} active={true} defaultStation="종로5가" defaultLine="1" previewPrefill={true}/>
 </main>;
}
