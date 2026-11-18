'use client';
import {congestionLevel} from '../lib/congestion-data';

const labels={
 ko:[['여유'],['보통'],['혼잡'],['매우혼잡']],
 en:[['Low'],['Mid'],['High'],['Peak']],
 ja:[['余裕'],['普通'],['混雑'],['非常に混雑']],
 zh:[['宽松'],['一般'],['拥挤'],['非常拥挤']]
};
const descriptions={ko:'예상 혼잡도 · 30분 평균, 개별 열차 실측값 아님',en:'Estimated crowding · 30-minute average, not individual trains',ja:'予想混雑度・30分平均（各列車の実測値ではありません）',zh:'预计拥挤度 · 30分钟平均值，并非单趟列车实测'};
export function crowdingClass(value){
 const level=congestionLevel(value);
 return level===null?'':' v2-crowding-heading v2-crowding-'+level;
}
export function crowdingDescription(value,lang='ko'){
 const level=congestionLevel(value);
 return level===null?'':(descriptions[lang]||descriptions.ko)+' · '+(labels[lang]||labels.ko)[level].join(' ')+' '+value+'%';
}
export function CrowdingIndicator({value,lang='ko',numeric=false,onInfo=null}){
 const level=congestionLevel(value);
 if(level===null)return null;
 const Tag=onInfo?'button':'span';
 return <Tag {...(onInfo?{type:'button',onClick:onInfo}:{})} className="v2-crowding-indicator" lang={lang==='zh'?'zh-CN':lang} aria-label={crowdingDescription(value,lang)} title={crowdingDescription(value,lang)}>
  <svg viewBox="0 0 30 22" aria-hidden="true">{[0,1,2].map(i=><g key={i} transform={'translate('+i*10+' 0)'} fill="currentColor" opacity={i<=level?1:.20}><circle cx="5" cy="3.5" r="2.8"/><path d="M2.1 9Q2.1 7 5 7Q7.9 7 7.9 9L9.4 14H7.4V21H5.7V14H4.3V21H2.6V14H.6Z"/></g>)}</svg>
  <span className={'v2-crowding-label'+(numeric?' v2-crowding-number':'')} aria-hidden="true">{numeric?value+'%':(labels[lang]||labels.ko)[level].map((part,i)=><span key={i}>{part}</span>)}</span>
 </Tag>;
}
