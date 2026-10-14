"use client";

import { useState } from "react";

// Images from Wikimedia Commons. Photo licenses and source links are preserved below.
const PLACES = [
  {
    id: "gwangjang", names: {ko:"광장시장",en:"Gwangjang Market",ja:"広蔵市場",zh:"广藏市场"},
    descriptions: {ko:"전통시장 · 길거리 음식",en:"Traditional market · street food",ja:"伝統市場・屋台グルメ",zh:"传统市场 · 街头美食"},
    details:{"ko":"K-푸드의 성지로 꼽히는 대한민국 최초의 상설 전통시장입니다. 빈대떡, 원조김밥, 육회, 수수부꾸미 등 다양한 길거리 음식과 먹거리 장터가 유명합니다.","en":"One of Korea's earliest permanent traditional markets and a favorite for Korean street food. Try bindaetteok (mung bean pancakes), original-style gimbap, yukhoe (beef tartare), and sweet millet pancakes.","ja":"韓国初期の常設伝統市場の一つで、Kフードの名所です。緑豆チヂミ、元祖キンパ、ユッケ、ススプクミなど多彩な屋台料理を楽しめます。","zh":"韩国最早的常设传统市场之一，也是韩式美食热门地。绿豆煎饼、迷你紫菜包饭、生拌牛肉和小米煎饼等街头美食十分有名。"},
    exit:"7·8", image:"Gwangjang Market, Seoul 02.jpg", credit:"Bgag · CC0 1.0",
    map:"Gwangjang Market Seoul",
  },
  {
    id: "stream", names:{ko:"청계천",en:"Cheonggyecheon",ja:"清渓川",zh:"清溪川"},
    descriptions:{ko:"도심 속 하천 산책로",en:"Urban stream and walking path",ja:"都心の川沿い散歩道",zh:"城市溪流步道"},
    details:{"ko":"도심 속 하천으로, 낮에는 시원한 물줄기를 보며 산책하기 좋고 밤에는 야경과 조명을 즐길 수 있는 대표 명소입니다.","en":"An urban stream ideal for a daytime walk beside flowing water, with scenic lights and night views after dark.","ja":"都心を流れる川で、昼は水辺の散歩、夜はライトアップや夜景を楽しめる人気スポットです。","zh":"流经市中心的溪流，白天适合沿水散步，夜晚可欣赏灯光和城市夜景。"},
    exit:"5·6", image:"Cheonggyecheon, Seoul - Cheonggyecheon2321.jpg", credit:"lumoplank · CC0 1.0",
    map:"Cheonggyecheon near Jongno 5-ga Seoul",
  },
  {
    id:"bangsan", names:{ko:"방산시장",en:"Bangsan Market",ja:"芳山市場",zh:"芳山市场"},
    descriptions:{ko:"베이킹 재료 · 포장용품",en:"Baking and packaging supplies",ja:"製菓材料・包装用品",zh:"烘焙材料 · 包装用品"},
    details:{"ko":"베이킹 재료, 포장용기, 인테리어 벽지, 판촉물 등을 도소매로 구매할 수 있는 전문 시장입니다.","en":"A specialty wholesale and retail market for baking ingredients, packaging materials, wallpaper, and promotional goods.","ja":"製菓材料、包装容器、インテリア用壁紙、販促品などを卸売・小売で購入できる専門市場です。","zh":"可批发和零售购买烘焙材料、包装容器、室内装饰墙纸及促销用品的专业市场。"},
    exit:"7·8", image:"방산시장 1.jpg", credit:"Kyimang · CC BY-SA 3.0",
    map:"Bangsan Market Seoul",
  },
  {
    id:"pharmacy", names:{ko:"종로5가 약국거리",en:"Pharmacy Street",ja:"鍾路5街 薬局街",zh:"钟路5街 药店街"},
    descriptions:{ko:"약국 · 의료기기 상가",en:"Pharmacies · medical supplies",ja:"薬局・医療用品",zh:"药店 · 医疗用品"},
    details:{"ko":"보령약국 등 유명 대형 약국들과 의료기기·한방 상가가 밀집해 있어 영양제나 상비약 등을 구매하기 좋은 거리입니다.","en":"A street lined with large pharmacies, including Boryung Pharmacy, as well as medical-supply and traditional-medicine shops. Visitors can shop for supplements and everyday medicines.","ja":"保寧薬局などの大型薬局や医療機器・韓方関連の店舗が集まる通りです。サプリメントや常備薬などを購入できます。","zh":"保宁药局等大型药店，以及医疗器械和韩药商铺集中于此，适合购买营养补充剂和常备药。"},
    exit:"2·3", image:"/images/pharmacy_jongno5.webp", credit:null, illustrative:true, map:"Jongno 5-ga pharmacy street Seoul",
  },
];
const UI = {
  ko:{heading:"출구·관광지",origin:"종로5가역 주변",exit:"추천 출구",pending:"출구 확인 중",map:"구글 지도에서 보기",back:"다른 장소 선택",note:"출구 번호는 참고용입니다. 현장 안내도에서 확인하세요.",photo:"사진 준비 중",source:"사진 출처",places:"관광지",exits:"출구별 안내",exitSuffix:"번 출구",exitShort:"번",exitHeading:"출구별 주요 목적지"},
  en:{heading:"Exits & Places",origin:"Near Jongno 5-ga",exit:"Recommended exit",pending:"Exit being verified",map:"View on Google Maps",back:"Choose another place",note:"Please confirm exit numbers with station signage.",photo:"Photo coming soon",source:"Photo credit",places:"Places",exits:"By Exit",exitSuffix:"Exit",exitShort:"Exit",exitHeading:"Destinations by exit"},
  ja:{heading:"出口・観光地",origin:"鍾路5街駅周辺",exit:"おすすめ出口",pending:"出口を確認中",map:"Googleマップで見る",back:"別の場所を選ぶ",note:"出口番号は駅構内の案内表示でもご確認ください。",photo:"写真準備中",source:"写真提供",places:"観光地",exits:"出口別案内",exitSuffix:"番出口",exitShort:"番",exitHeading:"出口別の主な施設"},
  zh:{heading:"出口·景点",origin:"钟路5街站附近",exit:"推荐出口",pending:"出口待核实",map:"在谷歌地图查看",back:"选择其他地点",note:"请以车站现场出口指示牌为准。",photo:"照片准备中",source:"图片来源",places:"景点",exits:"按出口查看",exitSuffix:"号出口",exitShort:"号",exitHeading:"各出口主要地点"},
};
const EXITS = [
 {number:"1",names:{ko:"종로5가우체국 · 두산아트센터",en:"Jongno 5-ga Post Office · Doosan Art Center",ja:"鍾路5街郵便局・斗山アートセンター",zh:"钟路5街邮局 · 斗山艺术中心"}},
 {number:"2",names:{ko:"삼양홀딩스 · 홍익대학교 대학로캠퍼스 · 현대아산",en:"Samyang Holdings · Hongik Univ. Daehak-ro Campus · Hyundai Asan",ja:"三養ホールディングス・弘益大学大学路キャンパス・現代峨山",zh:"三养控股 · 弘益大学大学路校区 · 现代峨山"}},
 {number:"3",names:{ko:"서울효제초등학교 · 대학로 방면 · 중부교육지원청 · 서울지방국세청 효제별관",en:"Seoul Hyoje Elementary School · Daehak-ro · Education Office · Tax Office Annex",ja:"ソウル孝悌小学校・大学路方面・中部教育支援庁・税務署別館",zh:"首尔孝悌小学 · 大学路方向 · 中部教育支援厅 · 税务署别馆"}},
 {number:"4",names:{ko:"종로5·6가동 행정복지센터",en:"Jongno 5·6-ga Community Service Center",ja:"鍾路5・6街洞住民センター",zh:"钟路5·6街行政福利中心"}},
 {number:"5",names:{ko:"종로신진시장 · 종로5가 먹자골목",en:"Jongno Sinjin Market · Food Alley",ja:"鍾路新進市場・鍾路5街グルメ通り",zh:"钟路新进市场 · 美食街"}},
 {number:"6",names:{ko:"청계천5가 · 마전교 · 훈련원공원",en:"Cheonggyecheon 5-ga · Majeon Bridge · Hullyeonwon Park",ja:"清渓川5街・馬廛橋・訓練院公園",zh:"清溪川5街 · 马廛桥 · 训练院公园"}},
 {number:"7",names:{ko:"방산시장 · 종로5가파출소 · 광장시장 · 마전교 · 광장시장전골목",en:"Bangsan Market · Police Substation · Gwangjang Market · Majeon Bridge",ja:"芳山市場・派出所・広蔵市場・馬廛橋",zh:"芳山市场 · 派出所 · 广藏市场 · 马廛桥"}},
 {number:"8",names:{ko:"광장시장 · 광장시장전골목",en:"Gwangjang Market · Jeon Alley",ja:"広蔵市場・チヂミ通り",zh:"广藏市场 · 煎饼巷"}},
];
const exitLabel = (number,lang,t) => lang==="en" ? `Exit ${number}` : `${number}${t.exitSuffix}`;
const commons = name => "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(name.replaceAll(" ","_"));
const thumb = name => name.startsWith("/") ? name : "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(name) + "?width=480";
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
      <small className="np-place-description">{p.descriptions[lang] || p.descriptions.ko}</small>
      {p.illustrative && <small className="np-illustrative">{lang==="ko"?"※ 약국 상징 사진":lang==="ja"?"※ 薬局のイメージ写真":lang==="zh"?"※ 药店示意照片":"※ Pharmacy illustration"}</small>}
    </button>)}</div> : <div className="np-detail">
      <button type="button" className="np-back" onClick={()=>setSelected(null)}>← {t.back}</button>
      {place.image && <img className="np-hero" src={thumb(place.image)} alt={place.names[lang] || place.names.ko}/>}
      <h3>{place.names[lang] || place.names.ko}</h3>
      <p>{place.details?.[lang] || place.details?.ko || place.descriptions[lang] || place.descriptions.ko}</p>
      {place.illustrative && <p className="np-illustrative">{lang==="ko"?"※ 약국을 나타내는 참고사진으로, 종로5가에서 촬영한 사진은 아닙니다.":lang==="ja"?"※ 薬局の参考写真です。鍾路5街で撮影されたものではありません。":lang==="zh"?"※ 药店示意照片，并非拍摄于钟路5街。":"※ Illustrative pharmacy photo, not taken in Jongno 5-ga."}</p>}
      <div className="np-exit"><span>{t.exit}</span><strong>{place.exit ? exitLabel(place.exit,lang,t) : t.pending}</strong></div>
      <a className="np-map" href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(place.map)} target="_blank" rel="noopener noreferrer">🗺 {t.map} ↗</a>
      {place.image && place.credit && <a className="np-credit" href={commons(place.image)} target="_blank" rel="noopener noreferrer">{t.source}: {place.credit} ↗</a>}
    </div>}
    <style>{`
      .np-card{box-sizing:border-box;width:100%;padding:10px;border:1px solid #dce7e8;border-radius:16px;background:#fff;color:#1b3038;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .np-card *{box-sizing:border-box}.np-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.np-header strong{font-size:16px}.np-header span{font-size:11px;color:#638088}
      .np-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 9px;padding:3px;background:#edf3f2;border-radius:10px}
      .np-tabs button{padding:7px 4px;border:0;border-radius:8px;background:transparent;color:#536d71;font-weight:750;font-size:13px;cursor:pointer}
      .np-tabs button.active{background:#fff;color:#087f69;box-shadow:0 1px 5px #00000012}
      .np-exits{display:grid;grid-template-columns:1fr;gap:6px}.np-exit-row{display:flex;align-items:center;gap:6px;padding:8px 6px;border:1px solid #e0e9eb;border-radius:10px;font-size:12px;line-height:1.4}
      .np-exit-number{flex:0 0 58px;text-align:center;background:#e5f5ee;border-radius:7px;padding:6px 2px;color:#087f69;font-size:12px;font-weight:800}
      .np-card-exit{margin:0 7px;color:#087f69;font-size:12px;font-weight:800}
      .np-card-pending{margin:0 7px;color:#75878a;font-size:10px}
      .np-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .np-place{display:flex;flex-direction:column;align-items:stretch;text-align:left;gap:2px;min-width:0;padding:0 0 5px;background:#fff;border:1px solid #e0e9eb;border-radius:12px;overflow:hidden;cursor:pointer;color:inherit}
      .np-place img,.np-photo-missing{display:block;width:100%;aspect-ratio:2.15/1;object-fit:cover;background:#e8f1ef}
      .np-photo-missing{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;color:#75928b}.np-photo-missing span{font-size:25px}
      .np-place strong{font-size:12px;padding:0 7px}.np-place-title{display:flex;align-items:center;gap:5px;white-space:nowrap;letter-spacing:-.35px}.np-place-title .np-title-exit{color:#087f69;flex:0 0 auto;font-size:11px}.np-place-description{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.np-illustrative{font-size:9px!important;color:#94672b!important;line-height:1.25!important}.np-place small{font-size:10px;color:#617b84;padding:0 7px;line-height:1.4}
      .np-place:focus-visible,.np-back:focus-visible{outline:3px solid #128a72;outline-offset:2px}
      .np-back{border:0;background:none;color:#087f6d;font-size:12px;font-weight:700;padding:3px 0 12px;cursor:pointer}
      .np-hero{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px}.np-detail h3{margin:12px 0 5px;font-size:19px}.np-detail p{margin:0 0 14px;font-size:13px;color:#617b84}
      .np-exit{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#edf6f3;padding:12px;border-radius:10px;margin-bottom:12px;font-size:12px}.np-exit strong{color:#007c66}
      .np-map{display:block;text-align:center;background:#087f69;color:white;text-decoration:none;padding:12px;border-radius:10px;font-weight:750;font-size:13px}
      .np-credit{display:block;font-size:10px;color:#647f85;margin-top:12px;text-decoration:underline}.np-note{font-size:10px;color:#71848a;margin:8px 0 0;line-height:1.5}
    `}</style>
  </section>;
}
