"use client";

import { useState } from "react";

const MODES = [
  { value: "duration", label: "최소시간" },
  { value: "distance", label: "최단거리" },
  { value: "transfer", label: "최소환승" },
];
const PRESETS = ["강남", "안암", "잠실", "홍대입구"];

function lineColor(line) {
  const colors = {
    "1호선": "#1757ad", "2호선": "#188f51", "3호선": "#da7a18",
    "4호선": "#1a9bc9", "5호선": "#8a4ca0", "6호선": "#996d22",
    "7호선": "#58671c", "8호선": "#cc276a", "9호선": "#8d7b3f",
    "신분당선": "#bd2732", "경의중앙선": "#609d87", "분당선": "#e7aa20",
  };
  return colors[line] || "#445267";
}

function elapsed(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${h > 0 ? `${h}시간 ` : ""}${m % 60}분${s % 60 ? ` ${s % 60}초` : ""}`;
}

function Fare({ fare }) {
  return <>{Number(fare || 0).toLocaleString("ko-KR")}원</>;
}

function LinePill({ line }) {
  return <span className="metro-line" style={{ backgroundColor: lineColor(line) }}>{line}</span>;
}

export default function RouteTestPage() {
  const [destination, setDestination] = useState("강남");
  const [mode, setMode] = useState("duration");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [route, setRoute] = useState(null);
  const [seconds, setSeconds] = useState(null);

  async function runTest(event) {
    event?.preventDefault();
    const to = destination.trim();
    if (!to) { setError("도착역을 입력해 주세요."); return; }
    setBusy(true);
    setError("");
    setRoute(null);
    setSeconds(null);
    const started = performance.now();
    try {
      const qs = new URLSearchParams({ to, mode });
      const response = await fetch(`/api/subway-route?${qs}`, { cache: "no-store" });
      const data = await response.json();
      setSeconds(Math.round(performance.now() - started));
      if (!response.ok || !data.ok) throw new Error(data.error || "경로 조회에 실패했습니다.");
      setRoute(data.route);
    } catch (e) {
      setError(e?.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="metro-root">
      <div className="metro-wrap">
        <header className="metro-header">
          <div className="metro-eyebrow">SUBWAY AI GUIDE · API LAB</div>
          <h1>지하철 경로 조회 테스트</h1>
          <p>서울교통공사 공식 최단경로 API를 직접 호출합니다. Gemini 및 기존 챗봇과 독립적으로 작동합니다.</p>
          <div className="metro-status"><span className="metro-dot"/> 독립 테스트 페이지 · 기존 챗봇 변경 없음</div>
        </header>

        <section className="metro-panel" aria-label="경로 검색">
          <div className="metro-section-title"><span>01</span> 경로 검색</div>
          <form onSubmit={runTest}>
            <div className="metro-fields">
              <label className="metro-label">
                출발역 <input value="종로5가" readOnly aria-label="출발역 (종로5가 고정)" className="metro-input metro-readonly" />
              </label>
              <label className="metro-label">
                도착역 <input value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={30} autoComplete="off" className="metro-input" placeholder="예: 강남" />
              </label>
            </div>
            <div className="metro-presets" aria-label="빠른 목적지 선택">
              <span>빠른 선택</span>
              {PRESETS.map((p) => (
                <button type="button" key={p} className={`metro-preset ${destination === p ? "metro-selected" : ""}`} onClick={() => { setDestination(p); setError(""); }}>{p}</button>
              ))}
            </div>
            <div className="metro-search-header">경로 검색 기준</div>
            <div className="metro-mode-row">
              {MODES.map((m) => (
                <label className={`metro-mode ${mode === m.value ? "is-active" : ""}`} key={m.value}>
                  <input type="radio" name="metro-search-mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} />
                  {m.label}
                </label>
              ))}
            </div>
            <button className="metro-submit" type="submit" disabled={busy}>
              {busy ? "공식 API 조회 중…" : "경로 조회하기 →"}
            </button>
          </form>
          <p className="metro-note">현재 한국 시각의 열차시간표를 기준으로 조회합니다. 역명은 ‘강남’처럼 입력해 주세요.</p>
        </section>

        {error && <section className="metro-error" role="alert"><strong>조회 실패</strong><p>{error}</p><small>인증키를 방금 추가했다면 Vercel 재배포 여부도 확인해 주세요.</small></section>}
        {route && <section className="metro-result" aria-live="polite">
          <div className="metro-result-top">
            <div>
              <div className="metro-section-title"><span>02</span> 공식 경로 조회 결과</div>
              <h2>{route.origin} <span className="metro-arrow">→</span> {route.destination}</h2>
              <p className="metro-when">조회 기준: {route.searchedAt} (한국시간) · {MODES.find(m => m.value === route.searchType)?.label || route.searchType}</p>
            </div>
            {seconds != null && <span className="metro-latency">API 응답 { (seconds / 1000).toFixed(2) }초</span>}
          </div>
          <div className="metro-metrics">
            <div><span>예상 소요시간</span><strong>{elapsed(route.totalSeconds)}</strong></div>
            <div><span>환승 횟수</span><strong>{route.transferCount}회</strong></div>
            <div><span>교통카드 운임</span><strong><Fare fare={route.fareWon} /></strong></div>
            <div><span>이동 거리</span><strong>{(route.totalMeters / 1000).toFixed(1)}km</strong></div>
          </div>

          <div className="metro-timeline-title">추천 이동 경로</div>
          <div className="metro-timeline">
            {route.itinerary.map((step, i) => step.type === "transfer" ? (
              <div className="metro-stop metro-transfer" key={`t-${i}`}>
                <div className="metro-marker"><span>↔</span></div>
                <div className="metro-stop-content">
                  <div className="metro-stop-heading"><strong>{step.station} 환승</strong><span className="metro-tag">환승</span></div>
                  <div className="metro-line-row"><LinePill line={step.fromLine} /><span className="metro-mini-arrow">→</span><LinePill line={step.toLine} /></div>
                  {step.seconds > 0 && <p className="metro-stop-detail">환승 구간 소요 {elapsed(step.seconds)}{step.waitingSeconds > 0 ? " (대기 포함)" : ""}</p>}
                </div>
              </div>
            ) : (
              <div className="metro-stop metro-ride" key={`r-${i}`}>
                <div className="metro-marker"><span>●</span></div>
                <div className="metro-stop-content">
                  <div className="metro-stop-heading"><strong>{step.from} → {step.to}</strong></div>
                  <div className="metro-line-row"><LinePill line={step.line} />{step.direction && <span className="metro-direction">{step.direction}행 열차</span>}</div>
                  <p className="metro-stop-detail">이동 구간 {step.segments}개{step.departureTime ? ` · 첫 열차 ${step.departureTime}` : ""}{step.arrivalTime ? ` · 마지막 도착 ${step.arrivalTime}` : ""}</p>
                </div>
              </div>
            ))}
          </div>

          <details className="metro-details">
            <summary>경유 역 전체 보기 ({route.allStations.length}개 역)</summary>
            <div className="metro-stations">{route.allStations.join(" → ")}</div>
          </details>
          <details className="metro-details">
            <summary>응답 데이터 진단 정보</summary>
            <div className="metro-stations">원본 이동 구간 {route.diagnostics.rawSegments}개 · 추출한 환승 {route.diagnostics.parsedTransfers}회<br/>API 결과는 검색 시각과 조건에 따라 달라질 수 있습니다.</div>
          </details>
          <p className="metro-disclaimer">안내는 공식 API 검색 결과를 그대로 구조화한 것으로, 현장 운행 상황과 다를 수 있습니다. 신분당선 등 추가 운임이 발생할 수 있으며 실제 요금은 이용 조건에 따라 다를 수 있습니다.</p>
        </section>}

        <footer className="metro-footer">서울교통공사 최단경로이동정보 · 개발용 테스트 페이지<br/>이 페이지는 기존 <code>/</code> 메인 챗봇 및 <code>/api/google-search</code>와 연결되지 않습니다.</footer>
      </div>
      <style>{`
        .metro-root{min-height:100vh;background:#edf4f5;color:#172b33;padding:32px 16px 60px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}
        .metro-root *{box-sizing:border-box}
        .metro-wrap{max-width:800px;margin:0 auto}
        .metro-header{padding:18px 6px 24px}
        .metro-eyebrow{font-size:12px;letter-spacing:.16em;color:#007b68;font-weight:800}
        .metro-header h1{font-size:29px;letter-spacing:-.04em;margin:10px 0 8px;font-weight:800}
        .metro-header p{color:#657680;font-size:14px;line-height:1.7;margin:0 0 16px}
        .metro-status{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#087e6b;background:#e0f2eb;border:1px solid #b9e2d4;border-radius:40px;padding:7px 12px;font-weight:650}
        .metro-dot{background:#0b9479;width:8px;height:8px;border-radius:50%}
        .metro-panel,.metro-result,.metro-error{background:#fff;border:1px solid #d8e5e8;border-radius:20px;padding:24px;box-shadow:0 8px 35px rgba(13,60,65,.04);margin-bottom:18px}
        .metro-section-title{display:flex;align-items:center;gap:9px;color:#007b68;font-size:14px;font-weight:800;margin-bottom:20px}
        .metro-section-title span{font-size:11px;background:#e1f4ee;color:#057b66;border-radius:7px;padding:4px 7px}
        .metro-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .metro-label{display:flex;flex-direction:column;gap:8px;color:#3c5360;font-size:13px;font-weight:750}
        .metro-input{border:1px solid #cad9dd;border-radius:12px;padding:14px;font-size:16px;width:100%;font-family:inherit;outline:none;background:#fff;color:#162a32;min-width:0}
        .metro-input:focus{border-color:#00856e;box-shadow:0 0 0 3px #dcefe9}
        .metro-readonly{background:#f3f7f8;color:#697b83}
        .metro-presets{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0 22px}
        .metro-presets>span{font-size:12px;color:#7a8990;margin-right:2px}
        .metro-preset{border-radius:50px;border:1px solid #d3e1e3;padding:7px 12px;background:#fff;color:#49606c;font-size:12px;cursor:pointer;font-family:inherit}
        .metro-selected{border-color:#80c6b3;background:#e7f5ef;color:#006e5d}
        .metro-search-header{font-size:13px;font-weight:750;color:#394f5c;margin-bottom:10px}
        .metro-mode-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
        .metro-mode{border:1px solid #d8e4e5;border-radius:12px;background:#fff;padding:13px 8px;text-align:center;font-weight:700;font-size:13px;cursor:pointer;color:#516773}
        .metro-mode.is-active{color:#00755f;border-color:#20a084;background:#e7f6f0}
        .metro-mode input{position:absolute;opacity:0;width:1px;height:1px}
        .metro-mode:focus-within{outline:2px solid #20a084;outline-offset:2px}
        .metro-submit{border:0;background:#007f68;border-radius:12px;width:100%;padding:15px 18px;font-weight:800;font-size:15px;color:#fff;cursor:pointer;font-family:inherit}
        .metro-submit:hover{background:#006d58}.metro-submit:disabled{opacity:.65;cursor:wait}
        .metro-note{font-size:12px;line-height:1.6;color:#7b8d94;margin:12px 0 0}
        .metro-error{background:#fff5f2;color:#a3392a;border-color:#f5bcae}
        .metro-error strong{display:block;margin-bottom:4px}.metro-error p{margin:0 0 6px}.metro-error small{color:#885e57}
        .metro-result-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
        .metro-result h2{font-size:24px;margin:-8px 0 4px;letter-spacing:-.04em}
        .metro-arrow{color:#008b70}
        .metro-when{font-size:12px;color:#7f9096;margin:6px 0 0}
        .metro-latency{background:#f0f6f6;color:#46616c;font-size:11px;padding:7px 9px;border-radius:20px;font-weight:650}
        .metro-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:23px 0 28px}
        .metro-metrics>div{background:#f2f7f8;border-radius:13px;padding:16px 12px;min-width:0}
        .metro-metrics span{display:block;color:#70858c;font-size:11px;margin-bottom:10px;white-space:nowrap}
        .metro-metrics strong{font-size:18px;letter-spacing:-.04em;white-space:nowrap;color:#12303a}
        .metro-timeline-title{font-size:15px;font-weight:800;margin-bottom:18px}
        .metro-timeline{margin-left:8px}
        .metro-stop{display:flex;gap:14px;position:relative;padding-bottom:23px}
        .metro-stop:not(:last-child):before{content:"";position:absolute;left:13px;top:30px;bottom:-1px;width:2px;background:#cddfdc}
        .metro-marker{height:28px;width:28px;flex:0 0 28px;display:grid;place-items:center;border-radius:50%;background:#e5f5ef;color:#078365;z-index:1;font-size:14px;font-weight:800}
        .metro-transfer .metro-marker{background:#dff0ee;color:#047b66}
        .metro-stop-content{padding-top:2px;min-width:0;flex:1}
        .metro-stop-heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:9px}
        .metro-stop-heading strong{font-size:16px;letter-spacing:-.025em}
        .metro-tag{color:#00755f;background:#e0f3ed;border-radius:20px;font-size:10px;font-weight:750;padding:3px 7px}
        .metro-line-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .metro-line{color:#fff;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:700;display:inline-flex;align-items:center}
        .metro-direction{font-size:13px;color:#50616b}
        .metro-mini-arrow{color:#7b9094;font-size:16px}
        .metro-stop-detail{margin:8px 0 0;color:#778990;font-size:12px;line-height:1.6}
        .metro-details{border-top:1px solid #e7eff0;padding:13px 0;color:#4c6570}
        .metro-details summary{cursor:pointer;font-size:13px;font-weight:700}
        .metro-stations{font-size:13px;line-height:2;padding:13px 4px 1px;color:#4c606a}
        .metro-disclaimer{font-size:12px;line-height:1.7;color:#86969d;margin:18px 0 0}
        .metro-footer{text-align:center;color:#8a9da3;font-size:12px;line-height:2;margin:26px 0}
        .metro-footer code{color:#56757d;background:#e5eff1;border-radius:5px;padding:2px 5px}
        @media(max-width:650px){.metro-root{padding:16px 12px 48px}.metro-header h1{font-size:25px}.metro-panel,.metro-result,.metro-error{padding:18px;border-radius:17px}.metro-fields{grid-template-columns:1fr}.metro-metrics{grid-template-columns:repeat(2,1fr)}.metro-metrics strong{font-size:19px}.metro-stop-heading strong{font-size:15px}}
      `}</style>
    </main>
  );
}
