'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

// Reuse the existing administrator session; no separate password or permission is introduced.
export default function TestAccess(){
 const router=useRouter();
 const [checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[password,setPassword]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  // The statistics cookie is scoped to /api/stats. This endpoint refreshes the
  // root-scoped administrator cookie when a valid statistics session already exists.
  fetch('/api/stats/auth',{cache:'no-store',signal:controller.signal}).then(async response=>{
   const data=await response.json();if(!response.ok)throw Error();
   if(active&&data.authenticated){setReady(true);router.refresh();}
  }).catch(()=>{if(active)setError('로그인 상태를 확인하지 못했습니다. 아래에서 다시 로그인해 주세요.');}).finally(()=>{if(active)setChecking(false);});
  return()=>{active=false;controller.abort();};
 },[router]);
 async function login(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/stats/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
   const data=await response.json();
   if(!response.ok||!data.authenticated){setError('관리자 비밀번호를 확인해 주세요.');return;}
   setPassword('');setReady(true);router.refresh();
  }catch{setError('로그인하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.');}
  finally{setBusy(false);}
 }
 const button={border:0,borderRadius:10,padding:'12px 16px',background:'#205d49',color:'#fff',fontSize:15,cursor:'pointer',minHeight:44};
 return <main style={{minHeight:'100dvh',background:'#f5f8f6',padding:'64px 18px',boxSizing:'border-box',color:'#234237'}}>
  <section style={{maxWidth:420,margin:'0 auto',padding:24,background:'#fff',border:'1px solid #dce7e1',borderRadius:16}}>
   <p style={{fontSize:12,color:'#6b8176',margin:'0 0 8px'}}>신규 API 시간표 테스트</p>
   <h1 style={{fontSize:22,margin:'0 0 14px'}}>관리자 로그인</h1>
   {checking?<p role="status">로그인 상태를 확인하고 있습니다…</p>:ready?<><p role="status">로그인을 확인했습니다. 시간표를 불러옵니다.</p><button type="button" style={button} onClick={()=>router.refresh()}>시간표 다시 열기</button></>:<>
    <p style={{fontSize:14,lineHeight:1.6,color:'#62796d'}}>기존 관리자 비밀번호로 로그인하면 테스트 시간표가 열립니다.</p>
    <form onSubmit={login}>
     <label htmlFor="operation-test-password" style={{display:'block',fontSize:14}}>관리자 비밀번호</label>
     <input id="operation-test-password" type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',boxSizing:'border-box',fontSize:16,padding:12,border:'1px solid #bed2c6',borderRadius:10,margin:'8px 0 14px'}}/>
     <button type="submit" disabled={busy} style={{...button,width:'100%'}}>{busy?'로그인 중…':'로그인하고 시간표 열기'}</button>
    </form>
   </>}
   {error&&<p role="alert" style={{fontSize:14,color:'#a43f34',lineHeight:1.5}}>{error}</p>}
  </section>
 </main>;
}
