"use client";

import { useState } from "react";

// Images from Wikimedia Commons. Photo licenses and source links are preserved below.
const PLACES = [
  {
    id: "gwangjang", names: {ko:"광장시장",en:"Gwangjang Market",ja:"広蔵市場",zh:"广藏市场"},
    descriptions: {ko:"전통시장 · 길거리 음식",en:"Traditional market · street food",ja:"伝統市場・屋台グルメ",zh:"传统市场 · 街头美食"},
    exit:"8", image:"Gwangjang Market, Seoul 02.jpg", credit:"Bgag · CC0 1.0",
    map:"Gwangjang Market Seoul",
  },
  {
    id: "stream", names:{ko:"청계천",en:"Cheonggyecheon",ja:"清渓川",zh:"清溪川"},
    descriptions:{ko:"도심 속 하천 산책로",en:"Urban stream and walking path",ja:"都心の川沿い散歩道",zh:"城市溪流步道"},
    exit:null, image:"Cheonggyecheon, Seoul - Cheonggyecheon2321.jpg", credit:"lumoplank · CC0 1.0",
    map:"Cheonggyecheon near Jongno 5-ga Seoul",
  },
  {
    id:"bangsan", names:{ko:"방산시장",en:"Bangsan Market",ja:"芳山市場",zh:"芳山市场"},
    descriptions:{ko:"베이킹 재료 · 포장용품",en:"Baking and packaging supplies",ja:"製菓材料・包装用品",zh:"烘焙材料 · 包装用品"},
    exit:null, image:"방산시장 1.jpg", credit:"Kyimang · CC BY-SA 3.0",
    map:"Bangsan Market Seoul",
  },
  {
    id:"pharmacy", names:{ko:"종로5가 약국거리",en:"Pharmacy Street",ja:"鍾路5街 薬局街",zh:"钟路5街 药店街"},
    descriptions:{ko:"약국 · 의료기기 상가",en:"Pharmacies · medical supplies",ja:"薬局・医療用品",zh:"药店 · 医疗用品"},
    exit:null, image:null, credit:null, map:"Jongno 5-ga pharmacy street Seoul",
  },
];
const UI = {
  ko:{heading:"출구·관광지",origin:"종로5가역 주변",exit:"추천 출구",pending:"출구 확인 중",map:"구글 지도에서 보기",back:"다른 장소 선택",note:"추천 출구는 현장 확인 후 순차 등록합니다.",photo:"사진 준비 중",source:"사진 출처"},
  en:{heading:"Exits & Places",origin:"Near Jongno 5-ga",exit:"Recommended exit",pending:"Exit being verified",map:"View on Google Maps",back:"Choose another place",note:"Exit numbers are added after on-site verification.",photo:"Photo coming soon",source:"Photo credit"},
  ja:{heading:"出口・観光地",origin:"鍾路5街駅周辺",exit:"おすすめ出口",pending:"出口を確認中",map:"Googleマップで見る",back:"別の場所を選ぶ",note:"出口番号は現地確認後に掲載します。",photo:"写真準備中",source:"写真提供"},
  zh:{heading:"出口·景点",origin:"钟路5街站附近",exit:"推荐出口",pending:"出口待核实",map:"在谷歌地图查看",back:"选择其他地点",note:"出口编号将在现场核实后添加。",photo:"照片准备中",source:"图片来源"},
};
const commons = name => "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(name.replaceAll(" ","_"));
const thumb = name => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(name) + "?width=480";
export default function NearbyPlacesCard({lang="ko"}) {
  const [selected,setSelected] = useState(null);
  const t = UI[lang] || UI.ko;
  const place = PLACES.find(p=>p.id===selected);
  return <section className="np-card" aria-label={t.heading}>
    <header className="np-header"><strong>📍 {t.heading}</strong><span>{t.origin}</span></header>
    {!place ? <div className="np-grid">{PLACES.map(p=><button type="button" className="np-place" key={p.id} onClick={()=>setSelected(p.id)}>
      {p.image ? <img src={thumb(p.image)} alt={p.names[lang] || p.names.ko} loading="lazy"/> : <div className="np-photo-missing"><span>✚</span><small>{t.photo}</small></div>}
      <strong>{p.names[lang] || p.names.ko}</strong>
      <small>{p.descriptions[lang] || p.descriptions.ko}</small>
    </button>)}</div> : <div className="np-detail">
      <button type="button" className="np-back" onClick={()=>setSelected(null)}>← {t.back}</button>
      {place.image && <img className="np-hero" src={thumb(place.image)} alt={place.names[lang] || place.names.ko}/>}
      <h3>{place.names[lang] || place.names.ko}</h3>
      <p>{place.descriptions[lang] || place.descriptions.ko}</p>
      <div className="np-exit"><span>{t.exit}</span><strong>{place.exit ? (lang==="ko" ? place.exit+"번 출구" : "Exit "+place.exit) : t.pending}</strong></div>
      <a className="np-map" href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(place.map)} target="_blank" rel="noopener noreferrer">🗺 {t.map} ↗</a>
      {place.image && <a className="np-credit" href={commons(place.image)} target="_blank" rel="noopener noreferrer">{t.source}: {place.credit} ↗</a>}
    </div>}
    <p className="np-note">{t.note}</p>
    <style>{`
      .np-card{box-sizing:border-box;width:100%;padding:14px;border:1px solid #dce7e8;border-radius:16px;background:#fff;color:#1b3038;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .np-card *{box-sizing:border-box}.np-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:13px}.np-header strong{font-size:16px}.np-header span{font-size:11px;color:#638088}
      .np-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      .np-place{display:flex;flex-direction:column;align-items:stretch;text-align:left;gap:5px;min-width:0;padding:0 0 9px;background:#fff;border:1px solid #e0e9eb;border-radius:12px;overflow:hidden;cursor:pointer;color:inherit}
      .np-place img,.np-photo-missing{display:block;width:100%;aspect-ratio:5/3;object-fit:cover;background:#e8f1ef}
      .np-photo-missing{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;color:#75928b}.np-photo-missing span{font-size:25px}
      .np-place strong{font-size:13px;padding:0 9px}.np-place small{font-size:11px;color:#617b84;padding:0 9px;line-height:1.4}
      .np-place:focus-visible,.np-back:focus-visible{outline:3px solid #128a72;outline-offset:2px}
      .np-back{border:0;background:none;color:#087f6d;font-size:12px;font-weight:700;padding:3px 0 12px;cursor:pointer}
      .np-hero{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px}.np-detail h3{margin:12px 0 5px;font-size:19px}.np-detail p{margin:0 0 14px;font-size:13px;color:#617b84}
      .np-exit{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#edf6f3;padding:12px;border-radius:10px;margin-bottom:12px;font-size:12px}.np-exit strong{color:#007c66}
      .np-map{display:block;text-align:center;background:#087f69;color:white;text-decoration:none;padding:12px;border-radius:10px;font-weight:750;font-size:13px}
      .np-credit{display:block;font-size:10px;color:#647f85;margin-top:12px;text-decoration:underline}.np-note{font-size:10px;color:#71848a;margin:13px 0 0;line-height:1.5}
    `}</style>
  </section>;
}
