"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { destinationForApi, directionName, lineName, stationName } from "../lib/stationNameI18n";
import { officialStationMatches, officialStationName } from "../lib/officialStations";

// Reuses the already tested /api/subway-route endpoint.
// No Gemini call, prompt classification, or AI translation happens here.
const COPY = {
  ko: {
    heading: "길찾기", question: "어디로 가시나요?", originTag: "종로5가 출발", from: "출발역", to: "도착역", toHint: "도착역 입력 (예: 강남)",
    shortcuts: "빠른 선택", criterion: "검색 기준", duration: "최소시간", distance: "최단거리", transfer: "최소환승",
    search: "경로 조회하기", searching: "공식 경로 조회 중…", result: "공식 경로 조회 결과", time: "예상 소요시간",
    transfers: "환승", fare: "교통카드 운임", length: "이동 거리", itinerary: "추천 이동 경로",
    change: "다른 역 검색", all: "경유 역 전체 보기", ride: "이동", board: "행 열차", transferAt: "환승",
    depart: "출발", arrive: "도착", stops: "정거장", mins: "분", secs: "초", hours: "시간", won: "원",
    suffix: "회", searchFailed: "조회 실패", empty: "도착역을 입력해주세요.",
    unsupported: "역명을 찾지 못했거나 같은 표기의 역이 여러 개입니다. 한국어 공식 역명으로 입력하거나 아래 빠른 선택을 이용해주세요.",
    disclosure: "경로 정보는 공식 API 기준이며 실제 운행과 다를 수 있습니다. 환승 구간 및 추가 운임은 현장 안내를 확인해주세요.",
  },
  en: {
    heading: "Directions", question: "Where would you like to go?", originTag: "From Jongno 5(o)-ga", from: "From", to: "To", toHint: "Destination (e.g. Gangnam)",
    shortcuts: "Popular", criterion: "Route preference", duration: "Fastest", distance: "Shortest", transfer: "Fewest transfers",
    search: "Find route", searching: "Checking official route…", result: "Official route result", time: "Travel time",
    transfers: "Transfers", fare: "Card fare", length: "Distance", itinerary: "Directions",
    change: "Search again", all: "Show all stations", ride: "Ride", board: "-bound train", transferAt: "Transfer",
    depart: "Departure", arrive: "Arrival", stops: "stops", mins: "min", secs: "sec", hours: "hr", won: "KRW",
    suffix: "", searchFailed: "Unable to find route", empty: "Please enter a destination.",
    unsupported: "Station name not found or ambiguous. Try the official Korean name or a popular destination below.",
    disclosure: "Route data comes from the official API and may differ from actual operations. Check local signs for transfers and surcharges.",
  },
  ja: {
    heading: "経路検索", question: "どちらへ行きますか？", originTag: "鍾路5街から出発", from: "出発駅", to: "到着駅", toHint: "到着駅（例：カンナム）",
    shortcuts: "よく使う駅", criterion: "検索条件", duration: "最短時間", distance: "最短距離", transfer: "最少乗換",
    search: "経路を検索", searching: "公式経路を検索中…", result: "公式経路検索結果", time: "所要時間",
    transfers: "乗換", fare: "交通カード運賃", length: "移動距離", itinerary: "おすすめ経路",
    change: "別の駅を検索", all: "全駅を見る", ride: "乗車", board: "方面", transferAt: "乗換",
    depart: "出発", arrive: "到着", stops: "駅", mins: "分", secs: "秒", hours: "時間", won: "ウォン",
    suffix: "回", searchFailed: "検索できませんでした", empty: "到着駅を入力してください。",
    unsupported: "駅名が見つからないか、複数の駅に一致します。韓国語の正式駅名または下の候補を使用してください。",
    disclosure: "公式APIに基づく経路です。実際の運行・乗換・追加運賃については現地案内をご確認ください。",
  },
  zh: {
    heading: "路线查询", question: "您想去哪里？", originTag: "从钟路五街出发", from: "出发站", to: "目的地", toHint: "输入目的地（例如：江南）",
    shortcuts: "热门车站", criterion: "查询方式", duration: "时间最短", distance: "距离最短", transfer: "换乘最少",
    search: "查询路线", searching: "正在查询官方路线…", result: "官方路线查询结果", time: "预计用时",
    transfers: "换乘", fare: "交通卡票价", length: "行驶距离", itinerary: "推荐路线",
    change: "重新查询", all: "显示所有途经站", ride: "乘车", board: "方向", transferAt: "换乘",
    depart: "出发", arrive: "到达", stops: "站", mins: "分钟", secs: "秒", hours: "小时", won: "韩元",
    suffix: "次", searchFailed: "查询失败", empty: "请输入目的地。",
    unsupported: "未找到车站或有多个同名候选。请使用韩文正式站名或选择下方常用车站。",
    disclosure: "路线信息来自官方API，可能与实际运行情况不同。请以现场换乘指示及附加票价为准。",
  },
};


function stationQuery(value) {
  return destinationForApi(value);
}

function elapsed(seconds, t) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;
  return [h ? `${h}${t.hours}` : "", `${m}${t.mins}`, s ? `${s}${t.secs}` : ""].filter(Boolean).join(" ");
}

function lineColor(name) {
  const map = {
    "1호선": "#1757ad", "2호선": "#188f51", "3호선": "#da7a18", "4호선": "#1a9bc9",
    "5호선": "#8a4ca0", "6호선": "#996d22", "7호선": "#58671c", "8호선": "#cc276a",
    "9호선": "#8d7b3f", "신분당선": "#bd2732", "경의중앙선": "#609d87", "수인분당선": "#e7aa20",
  };
  return map[name] || "#445267";
}

function Line({ name, lang }) {
  return <span className="srg-line" style={{ background: lineColor(name) }}>{lineName(name, lang)}</span>;
}

export default function SubwayRouteCard({ lang = "ko" }) {
  const t = COPY[lang] || COPY.ko;
  const [destination, setDestination] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = showSuggestions && destination.trim() ? officialStationMatches(destination, lang) : [];
  const display = (name) => officialStationName(name, lang, stationName);
  const [mode, setMode] = useState("duration");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [route, setRoute] = useState(null);
  const resultRef = useRef(null);
  const cardRef = useRef(null);
  const returningToSearchRef = useRef(false);
  useLayoutEffect(() => {
    if (!returningToSearchRef.current || route || !cardRef.current) return;
    returningToSearchRef.current = false;
    const scroller = cardRef.current.closest(".sag-chat");
    if (!scroller) return;
    const top = cardRef.current.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTop = Math.max(0, scroller.scrollTop + top - 8);
  }, [route]);
  useLayoutEffect(() => {
    if (!route || !resultRef.current) return;
    const result = resultRef.current;
    const scroller = result.closest(".sag-chat");
    if (!scroller) return;
    const top = result.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTop = Math.max(0, scroller.scrollTop + top - 8);
  }, [route]);

  const choices = [
    { value: "duration", label: t.duration },
    { value: "distance", label: t.distance },
    { value: "transfer", label: t.transfer },
  ];

  async function search(event) {
    event.preventDefault();
    const to = selectedStation?.ko || stationQuery(destination);
    const code = selectedStation?.code || "";
    if (!destination.trim()) { setError(t.empty); return; }
    if (!code && !to) { setError(t.unsupported); return; }
    setShowSuggestions(false);
    setBusy(true);
    setError("");
    setRoute(null);
    try {
      const params = new URLSearchParams({ to, mode });
      if (code) params.set("toCode", code);
      const response = await fetch(`/api/subway-route?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok || !data.route) {
        throw new Error(data?.error || t.searchFailed);
      }
      setRoute(data.route);
    } catch (e) {
      setError(e?.message || t.searchFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section ref={cardRef} className="srg-card" aria-label={t.heading}>
      <header className="srg-heading"><div className="srg-title"><span className="srg-train" aria-hidden="true">🚇</span><strong>{t.heading}</strong></div><span className="srg-origin">{t.originTag}</span></header>
      <form onSubmit={search}>
        <div className="srg-search-wrap">
          <span className="srg-search-icon" aria-hidden="true">⌕</span>
          <input id="srg-destination-input" aria-label={t.to} value={destination} onChange={(e) => { setDestination(e.target.value); setSelectedStation(null); setShowSuggestions(true); setError(""); }} onFocus={() => { if (destination.trim() && !selectedStation) setShowSuggestions(true); }} placeholder={t.toHint} maxLength={30} autoComplete="off" role="combobox" aria-expanded={suggestions.length > 0} aria-autocomplete="list" aria-controls="srg-suggestions" />
          {destination && <button type="button" className="srg-clear" aria-label={lang === "ko" ? "입력 지우기" : "Clear destination"} onClick={() => {setDestination("");setSelectedStation(null);setShowSuggestions(false);setError("");}}>×</button>}
          {suggestions.length > 0 && <div id="srg-suggestions" className="srg-suggestions" role="listbox">{suggestions.map((s) => <button type="button" role="option" aria-selected="false" key={s.code} className="srg-suggestion" onClick={() => { setSelectedStation(s); setDestination(s[lang] || s.ko); setShowSuggestions(false); setError(""); }}><span className="srg-suggestion-icon" aria-hidden="true">🚇</span><span className="srg-suggestion-text"><strong>{s[lang] || s.ko}</strong><small>{s.ko} · {(s.lines || [s.line]).map(line => line.replace(/^0([1-9])호선$/, "$1호선")).join(" · ")}</small></span><span className="srg-suggestion-arrow" aria-hidden="true">›</span></button>)}</div>}
        </div>
        <div className="srg-modes" role="group" aria-label={t.criterion}>{choices.map((choice) => <label className={mode === choice.value ? "srg-mode active" : "srg-mode"} key={choice.value}><input type="radio" name="subway-route-mode" checked={mode === choice.value} onChange={() => setMode(choice.value)} />{choice.label}</label>)}</div>
        <button type="submit" disabled={busy || !destination.trim()} className="srg-submit">{busy ? t.searching : <>{t.search} <span aria-hidden="true">→</span></>}</button>
      </form>
      {error && <div className="srg-error" role="alert"><strong>{t.searchFailed}</strong><p>{error}</p></div>}
      {route && <div ref={resultRef} className="srg-result" aria-live="polite">
        <div className="srg-result-label">{t.result}</div>
        <h3>{display(route.origin)} <span>→</span> {display(route.destination)}</h3>
        <div className="srg-metrics">
          <div><span>{t.time}</span><strong>{elapsed(route.totalSeconds, t)}</strong></div>
          <div><span>{t.transfers}</span><strong>{route.transferCount}{t.suffix}</strong></div>
          <div><span>{t.fare}</span><strong>{Number(route.fareWon || 0).toLocaleString("ko-KR")} {t.won}</strong></div>
          <div><span>{t.length}</span><strong>{(Number(route.totalMeters || 0) / 1000).toFixed(1)} km</strong></div>
        </div>
        <h4>{t.itinerary}</h4>
        <div className="srg-timeline">
          {(route.itinerary || []).map((step, index) => <div className="srg-stop" key={index}>
            <div className="srg-point">{step.type === "transfer" ? "↔" : "●"}</div>
            <div className="srg-stop-body">
              {step.type === "transfer" ? <><strong>{display(step.station)} · {t.transferAt}</strong><div className="srg-line-row"><Line name={step.fromLine} lang={lang} /> → <Line name={step.toLine} lang={lang} /></div></>
                : <><strong>{display(step.from)} → {display(step.to)}</strong><div className="srg-line-row"><Line name={step.line} lang={lang} />{step.direction && (lang === "ko" || directionName(step.direction, lang)) && <span>{directionName(step.direction, lang)}{lang === "en" ? "" : " "}{t.board}</span>}</div></>}
            </div>
          </div>)}
        </div>
        {Array.isArray(route.allStations) && route.allStations.length > 0 && <details className="srg-details"><summary>{t.all} ({route.allStations.length})</summary><p>{route.allStations.map((name) => display(name)).join(" → ")}</p></details>}
        <p className="srg-disclaimer">{t.disclosure}</p>
        <button type="button" className="srg-again" onClick={() => { returningToSearchRef.current = true; setRoute(null); setError(""); }}>{t.change}</button>
      </div>}
      <style>{`
        .srg-card{box-sizing:border-box;width:100%;padding:14px 16px 10px;border:1px solid #313b40;border-radius:18px;background:#11171b;color:#f2f6f6;box-shadow:0 6px 20px rgba(13,60,65,.08);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:anywhere}
        .srg-card *{box-sizing:border-box}
        .srg-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
        .srg-title{display:flex;align-items:center;gap:8px;font-size:17px}.srg-train{font-size:19px}
        .srg-origin{flex-shrink:0;max-width:53%;border-radius:100px;padding:5px 9px;background:#203c36;color:#a7e4d3;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .srg-question{display:block;font-size:17px;font-weight:750;margin-bottom:11px}
        .srg-search-wrap{position:relative;display:flex;align-items:center;gap:8px;background:#252d32;border:1px solid #38474b;border-radius:14px;padding:0 12px}
        .srg-search-wrap:focus-within{border-color:#61cbb1;box-shadow:0 0 0 2px #2c5b4e}
        .srg-search-icon{font-size:27px;line-height:1;color:#91aaa5}
        .srg-search-wrap input{width:100%;min-width:0;flex:1;padding:13px 0;background:transparent;border:0;outline:0;color:#fff;font-size:16px}
        .srg-search-wrap input::placeholder{color:#9aa9ae}
        .srg-clear{border:0;background:transparent;color:#aebdc0;font-size:24px;cursor:pointer;padding:0 2px}
        .srg-suggestions{position:absolute;z-index:30;top:calc(100% + 7px);left:0;right:0;max-height:min(190px,35dvh);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;background:#1c2429;border:1px solid #3a4b4c;border-radius:13px;box-shadow:0 10px 26px #0007}
        .srg-suggestion{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-bottom:1px solid #303b40;background:transparent;color:#f2f6f6;text-align:left;cursor:pointer}
        .srg-suggestion:hover,.srg-suggestion:focus{background:#2b393a}
        .srg-suggestion-icon{font-size:17px;opacity:.75}
        .srg-suggestion-text{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
        .srg-suggestion-text strong{font-size:13px;font-weight:700}.srg-suggestion-text small{font-size:11px;color:#a7b8bb}
        .srg-suggestion-arrow{font-size:23px;color:#87979c}
        .srg-preference{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:13px 0 12px;padding:9px 11px;border-radius:10px;background:#20292e;color:#a9b9bd;font-size:12px}
        .srg-preference select{max-width:65%;color:#e3f6ef;background:#20292e;border:0;font-size:12px;font-weight:750;text-align:right;outline:none;cursor:pointer}
        .srg-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:13px 0 12px}
        .srg-mode{display:flex;align-items:center;justify-content:center;border:1px solid #46545a;border-radius:10px;padding:10px 3px;color:#bac9cc;font-size:12px;font-weight:700;text-align:center;cursor:pointer}
        .srg-mode.active{border-color:#5bc3aa;background:#21473e;color:#a7e4d3}
        .srg-mode input{position:absolute;opacity:0;width:1px;height:1px}
        .srg-submit{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:#008c73;color:#fff;border:0;border-radius:11px;padding:12px;font-size:14px;font-weight:800;cursor:pointer}
        .srg-submit:disabled{opacity:.45;cursor:not-allowed}.srg-error{margin-top:12px;padding:12px;background:#422722;border:1px solid #86564b;border-radius:10px;color:#ffd3c8;font-size:12px}.srg-error p{margin:5px 0 0}
        .srg-result{margin-top:8px;border-radius:12px;background:#fff;color:#172b33;padding:12px}
        .srg-separator{height:1px;background:#e4edef;margin:20px 0}.srg-result-label{font-weight:800;color:#07816b;font-size:12px}.srg-result h3{margin:8px 0 15px;font-size:19px;letter-spacing:-.03em}.srg-result h3>span{color:#07816b}
        .srg-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.srg-metrics>div{background:#f2f7f8;border-radius:10px;padding:12px 10px;min-width:0}
        .srg-metrics span{display:block;color:#68818a;font-size:11px;margin-bottom:7px}.srg-metrics strong{font-size:15px;letter-spacing:-.03em}
        .srg-result h4{font-size:14px;margin:20px 0 12px}.srg-stop{display:flex;align-items:flex-start;gap:10px;position:relative;padding-bottom:17px}
        .srg-stop:not(:last-child):before{content:"";position:absolute;top:23px;bottom:0;left:11px;width:2px;background:#cddfdc}
        .srg-point{width:24px;height:24px;flex:0 0 24px;border-radius:50%;background:#e4f4ed;color:#00866d;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;z-index:1}
        .srg-stop-body{min-width:0;padding-top:2px;flex:1}.srg-stop-body>strong{font-size:13px}.srg-line-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:8px;color:#526771;font-size:12px}
        .srg-line{display:inline-block;padding:4px 7px;border-radius:5px;color:#fff;font-weight:700;font-size:11px}.srg-details{border-top:1px solid #e6eeee;padding:12px 0;margin-top:4px}.srg-details summary{cursor:pointer;font-size:12px;font-weight:700}.srg-details p{font-size:12px;line-height:1.8;color:#5e717b}
        .srg-disclaimer{font-size:11px;line-height:1.6;color:#788d93}.srg-again{width:100%;border:1px solid #bddbcf;background:#f0f9f6;color:#05755e;border-radius:10px;padding:10px;font-size:12px;font-weight:800;cursor:pointer}
        @media(max-width:420px){.srg-card{padding:13px}.srg-origin{font-size:10px;padding:5px 7px}.srg-metrics strong{font-size:14px}}
      `}</style>
    </section>
  );
}
