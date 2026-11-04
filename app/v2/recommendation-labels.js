import {copy,menuItems} from './copy';
export function recommendationLabel(id,lang){
 const t=copy[lang]||copy.ko;
 const label=id==='live'?t.liveTitle:t.menu[menuItems.findIndex(item=>item.id===id)];
 return ({ko:`${label} 보기`,en:`Open ${label}`,ja:`${label}を見る`,zh:`查看${label}`})[lang]||label;
}
