// Presentation only. Never change raw rows, rank, timing or train selection.
export function createArrivalLocalizer(stationName){
 return function localize(input,lang){
 const text=input==null||input===''?'—':String(input).trim();
 if(lang==='ko'||text==='—')return text;
 const i={en:0,ja:1,zh:2}[lang];if(i===undefined)return text;
 const name=n=>stationName(n.trim(),lang,false);
 const labels={상행:['Upbound','上り','上行'],하행:['Downbound','下り','下行'],내선:['Inner loop','内回り','内环'],외선:['Outer loop','外回り','外环'],일반:['Local','各駅停車','普通'],급행:['Express','急行','快速'],진입:['Approaching','進入','进站'],도착:['Arriving','到着','到站'],출발:['Departing','出発','出站'],운행중:['Running','運行中','运行中'],종착:['Terminating','終着','终到']};
 if(labels[text])return labels[text][i];
 const place=n=>{if(n==='전역')return ['Previous station','前駅','前一站'][i];return name(n);};
 let m=text.match(/^(.+)행$/);
 if(m){let dest=m[1],suffix='';const extra=dest.match(/^(.*?)\s*\((내선|외선|급행|일반|상행|하행)\)$/);if(extra){dest=extra[1];suffix=' ('+labels[extra[2]][i]+')';}const translated=name(dest);return translated?['To '+translated,translated+'行き','开往'+translated][i]+suffix:text;}
 m=text.match(/^(?:(\d+)분\s*)?(?:(\d+)초\s*)?후(?:\s*\(([^)]+)\))?$/);
 if(m&&(m[1]||m[2])){const n=m[1],sec=m[2],p=m[3]?place(m[3]):null;if(m[3]&&!p)return text;const tail=p?' ('+p+')':'';return [(n?n+' min':'')+(sec?(n?' ':'')+sec+' sec':''),(n?n+'分':'')+(sec?sec+'秒':'')+'後',(n?n+'分':'')+(sec?sec+'秒':'')+'后'][i]+tail;}
 m=text.match(/^\[(\d+)\]번째 전역(?:\s*\(([^)]+)\))?$/);if(m){const p=m[2]?place(m[2]):null;if(m[2]&&!p)return text;return [m[1]+' stops away',m[1]+'駅手前',m[1]+'站前'][i]+(p?' ('+p+')':'');}
 m=text.match(/^(.+?)\s*(진입|도착|출발)$/);if(m){const p=place(m[1]);return p?p+' · '+labels[m[2]][i]:text;}
 if(text.includes(' · ')){const parts=text.split(' · ').map(part=>name(part));return parts.every(Boolean)?parts.join(' · '):text;}
 return name(text)||text; // Unrecognized wording remains original, not a partial translation.
 };
}
