"use client";

import { useState } from "react";

// Images from Wikimedia Commons. Photo licenses and source links are preserved below.
const PLACES = [
  {
    id: "gwangjang", names: {ko:"광장시장",en:"Gwangjang Market",ja:"広蔵市場",zh:"广藏市场"},
    descriptions: {ko:"전통시장 · 길거리 음식",en:"Traditional market · street food",ja:"伝統市場・屋台グルメ",zh:"传统市场 · 街头美食"},
    exit:"7·8", image:"Gwangjang Market, Seoul 02.jpg", credit:"Bgag · CC0 1.0",
    map:"Gwangjang Market Seoul",
  },
  {
    id: "stream", names:{ko:"청계천",en:"Cheonggyecheon",ja:"清渓川",zh:"清溪川"},
    descriptions:{ko:"도심 속 하천 산책로",en:"Urban stream and walking path",ja:"都心の川沿い散歩道",zh:"城市溪流步道"},
    exit:"5·6", image:"Cheonggyecheon, Seoul - Cheonggyecheon2321.jpg", credit:"lumoplank · CC0 1.0",
    map:"Cheonggyecheon near Jongno 5-ga Seoul",
  },
  {
    id:"bangsan", names:{ko:"방산시장",en:"Bangsan Market",ja:"芳山市場",zh:"芳山市场"},
    descriptions:{ko:"베이킹 재료 · 포장용품",en:"Baking and packaging supplies",ja:"製菓材料・包装用品",zh:"烘焙材料 · 包装用品"},
    exit:"7·8", image:"방산시장 1.jpg", credit:"Kyimang · CC BY-SA 3.0",
    map:"Bangsan Market Seoul",
  },
  {
    id:"pharmacy", names:{ko:"종로5가 약국거리",en:"Pharmacy Street",ja:"鍾路5街 薬局街",zh:"钟路5街 药店街"},
    descriptions:{ko:"약국 · 의료기기 상가",en:"Pharmacies · medical supplies",ja:"薬局・医療用品",zh:"药店 · 医疗用品"},
    exit:"2·3", image:null, credit:null, map:"Jongno 5-ga pharmacy street Seoul",
  },
];
const UI = {
  ko:{heading:"출구·관광지",origin:"종로5가역 주변",exit:"추천 출구",pending:"출구 확인 중",map:"구글 지도에서 보기",back:"다른 장소 선택",note:"출구 번호는 참고용입니다. 현장 안내도에서 확인하세요.",photo:"사진 준비 중",source:"사진 출처",places:"관광지",exits:"출구별 안내",exitSuffix:"번 출구",exitShort:"번",exitHeading:"출구별 주요 목적지"},
  en:{heading:"Exits & Places",origin:"Near Jongno 5-ga",exit:"Recommended exit",pending:"Exit being verified",map:"View on Google Maps",back:"Choose another place",note:"Please confirm exit numbers with station signage.",photo:"Photo coming soon",source:"Photo credit",places:"Places",exits:"By Exit",exitSuffix:"Exit",exitShort:"Exit",exitHeading:"Destinations by exit"},
  ja:{heading:"出口・観光地",origin:"鍾路5街駅周辺",exit:"おすすめ出口",pending:"出口を確認中",map:"Googleマップで見る",back:"別の場所を選ぶ",note:"出口番号は駅構内の案内表示でもご確認ください。",photo:"写真準備中",source:"写真提供",places:"観光地",exits:"出口別案内",exitSuffix:"番出口",exitShort:"番",exitHeading:"出口別の主な施設"},
  zh:{heading:"出口·景点",origin:"钟路5街站附近",exit:"推荐出口",pending:"出口待核实",map:"在谷歌地图查看",back:"选择其他地点",note:"请以车站现场出口指示牌为准。",photo:"照片准备中",source:"图片来源",places:"景点",exits:"按出口查看",exitSuffix:"号出口",exitShort:"号",exitHeading:"各出口主要地点"},
};
const EXITS = [
  {number:"7·8",names:{ko:"광장시장 · 방산시장",en:"Gwangjang · Bangsan Markets",ja:"広蔵市場・芳山市場",zh:"广藏市场 · 芳山市场"}},
  {number:"2·3",names:{ko:"약국 · 의료기기 거리",en:"Pharmacies · Medical supplies",ja:"薬局・医療用品街",zh:"药店 · 医疗用品街"}},
  {number:"5·6",names:{ko:"청계천 산책로",en:"Cheonggyecheon Stream",ja:"清渓川の散歩道",zh:"清溪川步道"}},
];
const exitLabel = (number,lang,t) => lang==="en" ? `Exit ${number}` : `${number}${t.exitSuffix}`;
const commons = name => "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(name.replaceAll(" ","_"));
const thumb = name => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(name) + "?width=480";
export default function NearbyPlacesCard({lang="ko"}) {
  const [selected,setSelected] = useState(null);
  const [tab,setTab] = useState("places");
  const t = UI[lang] || UI.ko;
  const place = PLACES.find(p=>p.id===selected);
  return <section className="np-card" aria-label={t.heading}>
    <nav className="np-tabs" aria-label={t.heading}>
      <button type="button" className={tab==="places"?"active":""} onClick={()=>{setTab("places");setSelected(null)}}>{t.places}</button>
      <button type="button" className={tab==="exits"?"active":""} onClick={()=>{setTab("exits");setSelected(null)}}>{t.exits}</button>
    </nav>
    {tab==="exits" ? <div className="np-exits" aria-label={t.exitHeading}>
      {EXITS.map(e=><div className="np-exit-row" key={e.number}>
        <span className="np-exit-number">{exitLabel(e.number,lang,t)}</span>
        <span>{e.names[lang] || e.names.ko}</span>
      </div>)}
    </div> : !place ? <div className="np-grid">{PLACES.map(p=><button type="button" className="np-place" key={p.id} onClick={()=>setSelected(p.id)}>
      {p.image ? <img src={thumb(p.image)} alt={p.names[lang] || p.names.ko} loading="lazy"/> : <div className="np-photo-missing"><span>✚</span><small>{t.photo}</small></div>}
      <strong className="np-place-title"><span className="np-title-exit">{p.exit ? exitLabel(p.exit,lang,t) : t.pending}</span> <span>{p.names[lang] || p.names.ko}</span></strong>
    </button>)}</div> : <div className="np-detail">
      <button type="button" className="np-back" onClick={()=>setSelected(null)}>← {t.back}</button>
      {place.image && <img className="np-hero" src={thumb(place.image)} alt={place.names[lang] || place.names.ko}/>}
      <h3>{place.names[lang] || place.names.ko}</h3>
      <p>{place.descriptions[lang] || place.descriptions.ko}</p>
      <div className="np-exit"><span>{t.exit}</span><strong>{place.exit ? exitLabel(place.exit,lang,t) : t.pending}</strong></div>
      <a className="np-map" href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(place.map)} target="_blank" rel="noopener noreferrer">🗺 {t.map} ↗</a>
      {place.image && <a className="np-credit" href={commons(place.image)} target="_blank" rel="noopener noreferrer">{t.source}: {place.credit} ↗</a>}
    </div>}
    <p className="np-note">{t.note}</p>
    <style>{`
      .np-card{box-sizing:border-box;width:100%;padding:10px;border:1px solid #dce7e8;border-radius:16px;background:#fff;color:#1b3038;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .np-card *{box-sizing:border-box}.np-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.np-header strong{font-size:16px}.np-header span{font-size:11px;color:#638088}
      .np-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 9px;padding:3px;background:#edf3f2;border-radius:10px}
      .np-tabs button{padding:7px 4px;border:0;border-radius:8px;background:transparent;color:#536d71;font-weight:750;font-size:13px;cursor:pointer}
      .np-tabs button.active{background:#fff;color:#087f69;box-shadow:0 1px 5px #00000012}
      .np-exits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.np-exit-row{display:flex;align-items:center;gap:6px;padding:8px 6px;border:1px solid #e0e9eb;border-radius:10px;font-size:12px;line-height:1.4}
      .np-exit-number{flex:0 0 49px;text-align:center;background:#e5f5ee;border-radius:7px;padding:6px 2px;color:#087f69;font-size:12px;font-weight:800}
      .np-card-exit{margin:0 7px;color:#087f69;font-size:12px;font-weight:800}
      .np-card-pending{margin:0 7px;color:#75878a;font-size:10px}
      .np-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .np-place{display:flex;flex-direction:column;align-items:stretch;text-align:left;gap:2px;min-width:0;padding:0 0 5px;background:#fff;border:1px solid #e0e9eb;border-radius:12px;overflow:hidden;cursor:pointer;color:inherit}
      .np-place img,.np-photo-missing{display:block;width:100%;aspect-ratio:2.15/1;object-fit:cover;background:#e8f1ef}
      .np-photo-missing{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;color:#75928b}.np-photo-missing span{font-size:25px}
      .np-place strong{font-size:12px;padding:0 7px}.np-place-title{display:flex;align-items:center;gap:5px;white-space:nowrap;letter-spacing:-.35px}.np-place-title .np-title-exit{color:#087f69;flex:0 0 auto;font-size:11px}.np-place small{font-size:10px;color:#617b84;padding:0 7px;line-height:1.4}
      .np-place:focus-visible,.np-back:focus-visible{outline:3px solid #128a72;outline-offset:2px}
      .np-back{border:0;background:none;color:#087f6d;font-size:12px;font-weight:700;padding:3px 0 12px;cursor:pointer}
      .np-hero{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px}.np-detail h3{margin:12px 0 5px;font-size:19px}.np-detail p{margin:0 0 14px;font-size:13px;color:#617b84}
      .np-exit{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#edf6f3;padding:12px;border-radius:10px;margin-bottom:12px;font-size:12px}.np-exit strong{color:#007c66}
      .np-map{display:block;text-align:center;background:#087f69;color:white;text-decoration:none;padding:12px;border-radius:10px;font-weight:750;font-size:13px}
      .np-credit{display:block;font-size:10px;color:#647f85;margin-top:12px;text-decoration:underline}.np-note{font-size:10px;color:#71848a;margin:8px 0 0;line-height:1.5}
    `}</style>
  </section>;
}
