'use client';
import {congestionLevel} from '../lib/congestion-data';

import {copy as timetableCopy} from './timetable-lab/copy';
const gradeLabels=lang=>(timetableCopy[lang]||timetableCopy.ko).crowdLevels;
const descriptions={ko:'시간대별 예상 혼잡도 · 실시간 열차 위치와 별개의 30분 평균 통계',en:'Estimated crowding · 30-minute average, not live train occupancy',ja:'時間帯別の予想混雑度・30分平均（個別列車の実測値ではありません）',zh:'时段预计拥挤度 · 30分钟平均值，并非单趟列车实时数据'};
const policy={"ko":"시민 이용 편의를 위한 자체 혼잡도 분류 기준입니다 (35%·75%·110%).","en":"Passenger guidance uses custom crowding thresholds (35%, 75%, 110%).","ja":"利用者向けの独自の混雑度区分です（35%・75%・110%）。","zh":"为方便乘客出行，采用自定义拥挤度分级标准（35%、75%、110%）。"};
export function crowdingPolicyDescription(lang='ko'){return policy[lang]||policy.ko;}
export function crowdingClass(value){
 const level=congestionLevel(value);
 return level===null?'':' v2-crowding-heading v2-crowding-'+level;
}
export function crowdingDescription(value,lang='ko'){
 const level=congestionLevel(value);
 return level===null?'':(descriptions[lang]||descriptions.ko)+' · '+gradeLabels(lang)[level]+' '+value+'% · '+crowdingPolicyDescription(lang);
}
export function CrowdingIndicator({value,lang='ko',numeric=false,onInfo=null}){
 const level=congestionLevel(value);
 if(level===null)return null;
 const Tag=onInfo?'button':'span';
 return <Tag {...(onInfo?{type:'button',onClick:onInfo}:{})} className="v2-crowding-indicator" lang={lang==='zh'?'zh-CN':lang} aria-label={crowdingDescription(value,lang)} title={crowdingDescription(value,lang)}>
  <svg viewBox="0 0 30 22" aria-hidden="true">{[0,1,2].map(i=><g key={i} transform={'translate('+i*10+' 0)'} fill="currentColor" opacity={i<=level?1:.20}><circle cx="5" cy="3.5" r="2.8"/><path d="M2.1 9Q2.1 7 5 7Q7.9 7 7.9 9L9.4 14H7.4V21H5.7V14H4.3V21H2.6V14H.6Z"/></g>)}</svg>
  <span className={'v2-crowding-label'+(numeric?' v2-crowding-number':'')} aria-hidden="true">{numeric?Math.floor(value)+'%':<span>{gradeLabels(lang)[level]}</span>}</span>
 </Tag>;
}
