'use client';
import {useState} from 'react';
import {stationMaster,getStationByCode} from '../lib/station-master';
import FacilityDemo from '../v2/facilities-demo/FacilityDemo';
import './preview.css';
const samples=[['0154','종로5가 · 직접 조회'],['0311','연신내 3호선'],['0321','충무로 3호선'],['2810','암사역사공원 · 제외 확인']];
const languages=[['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文']];
export default function OfficeFacilityPreview(){
 const [code,setCode]=useState('0154'),[lang,setLang]=useState('ko');
 const station=getStationByCode(code);
 return <main className="of-preview">
  <header className="of-controls">
   <span className="of-eyebrow">시설안내 미리보기</span>
   <h1>고객안전실 안내</h1>
   <p>역과 언어를 바꿔 위치·전화번호·이용시간를 확인하세요.</p>
   <label className="of-select">기준역<select value={code} onChange={e=>setCode(e.target.value)}>{stationMaster.filter(s=>Number(s.line)<=8).map(s=><option key={s.stationCode} value={s.stationCode}>{s.line}호선 {s.names.ko} · {s.stationCode}</option>)}</select></label>
   <div className="of-languages" role="group" aria-label="표시 언어">{languages.map(([key,name])=><button key={key} lang={key} aria-pressed={lang===key} onClick={()=>setLang(key)}>{name}</button>)}</div>
   <div className="of-samples" role="group" aria-label="확인할 사례">{samples.map(([key,name])=><button key={key} aria-pressed={code===key} onClick={()=>setCode(key)}>{name}</button>)}</div>
   <small>고객안전실 필터를 누르면 해당 안내만 볼 수 있습니다. 암사역사공원·9호선은 고객안전실 안내 대상에서 제외됩니다.</small>
  </header>
  <section className="of-phone" aria-label="시설안내 화면" lang={lang==='zh'?'zh-CN':lang}>
   <div className="of-screen-title"><span>시설안내</span><span><b style={{background:station.color}}>{station.line}</b>{station.names[lang]}</span></div>
   <FacilityDemo key={code} embedded trackUsage={false} stationContext={station} lang={lang}/>
  </section>
 </main>;
}
