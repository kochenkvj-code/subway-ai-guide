"use client";

import { useState } from "react";

const VARIANTS = [
  { id: "improvedFlash", name: "A · Flash LOW", subtitle: "기존 ③ 설정 · 개선 검색 지시문" },
  { id: "flashMinimal", name: "B · Flash MINIMAL", subtitle: "같은 지시문 · 추론 수준만 변경" },
  { id: "flashConcise", name: "C · MINIMAL + 간결", subtitle: "간결한 답변 지시문 · 검색 유지" },
];
const EXAMPLES = [
  "종로5가역 근처에 환전소가 어디 있어?",
  "종로5가역 수유실은 어디에 있어?",
  "종로5가역 근처에 약국 있어?",
  "종로5가역에서 가장 가까운 짐 보관 장소 알려줘",
];

const inputStyle = {
  width: "100%", padding: "12px", border: "1px solid #d3dde4", borderRadius: 10,
  fontSize: 15, color: "#1e293b", background: "#fff", boxSizing: "border-box",
};
const panel = { background: "#fff", border: "1px solid #d5e0e8", borderRadius: 14, padding: 16 };
const button = {
  padding: "11px 16px", borderRadius: 10, border: 0, color: "white",
  background: "#087f64", cursor: "pointer", fontWeight: 700, fontSize: 14,
};

function Result({ item, state }) {
  const result = state?.data;
  const lab = result?.lab;
  return (
    <section style={{ ...panel, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: 17 }}>{item.name}</div>
      <div style={{ color: "#657489", fontSize: 12, marginTop: 4 }}>{item.subtitle}</div>
      {state?.loading ? (
        <p style={{ color: "#687582", marginTop: 20 }}>검색하고 답변을 생성하는 중…</p>
      ) : state?.error ? (
        <p style={{ color: "#b42318", wordBreak: "break-word" }}>{state.error}</p>
      ) : result ? (
        <>
          <p style={{ color: "#344156", fontSize: 12, marginTop: 16 }}>
            {lab?.durationMs != null ? `모델 ${ (lab.durationMs / 1000).toFixed(1) }초` : ""}
            {lab?.totalDurationMs != null ? ` · 서버 전체 ${(lab.totalDurationMs / 1000).toFixed(1)}초` : ""}
            {` · 검색어 ${result.googleSearchQueries?.length || 0}개`}
            {` · 출처 ${result.sources?.length || 0}개`}
            {` · 근거 연결 ${lab?.supportCount || 0}개`}
          </p>
          {lab?.tokenCost ? (
            <div style={{ background: "#f1f8f5", border: "1px solid #cfebde", borderRadius: 9, padding: "9px 11px", fontSize: 12, lineHeight: 1.7, marginTop: 8 }}>
              <strong>모델 토큰 추정 비용: ${lab.tokenCost.estimatedModelUsd.toFixed(5)}</strong>
              <div style={{ color: "#4b635a" }}>
                입력 {lab.tokenCost.inputTokens.toLocaleString()} · 답변 {lab.tokenCost.outputTokens.toLocaleString()} · 추론 {lab.tokenCost.thinkingTokens.toLocaleString()} 토큰
              </div>
              <div style={{ color: "#64748b", fontSize: 11 }}>글로벌 표준 요금 기준 · 검색 Grounding 비용/할인/세금 제외</div>
            </div>
          ) : null}
          <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>
            {result.answer}
          </div>
          <details style={{ marginTop: 16 }} open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>실제 구글 검색어</summary>
            {(result.googleSearchQueries || []).length ? (
              <ul style={{ paddingLeft: 20, overflowWrap: "anywhere", fontSize: 12 }}>
                {result.googleSearchQueries.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            ) : <p style={{ fontSize: 12, color: "#9a3412" }}>검색 실행 정보 없음 (근거 확인 필요)</p>}
          </details>
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>참조된 출처</summary>
            {(result.sources || []).length ? (
              <ul style={{ paddingLeft: 20, fontSize: 12, overflowWrap: "anywhere" }}>
                {result.sources.map((s, i) => (
                  <li key={i} style={{ marginTop: 6 }}>
                    <a href={s.url} rel="noopener noreferrer" target="_blank">{s.title || s.domain || s.url}</a>
                  </li>
                ))}
              </ul>
            ) : <p style={{ fontSize: 12 }}>연결된 출처 없음</p>}
          </details>
          {result.searchSuggestion ? (
            <div style={{ marginTop: 14, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 5 }}>Google Search Suggestions</div>
              {/* Google Search Suggestions markup is returned directly from Google's grounding service. */}
              <div style={{ maxWidth: "100%", overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: result.searchSuggestion }} />
            </div>
          ) : null}
        </>
      ) : <p style={{ color: "#8a99a7", fontSize: 13, marginTop: 20 }}>비교 실행을 누르면 결과가 표시돼.</p>}
    </section>
  );
}

export default function SearchLab() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const [lang, setLang] = useState("ko");
  const [key, setKey] = useState("");
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(false);

  async function compare(e) {
    e.preventDefault();
    if (!question.trim() || !key.trim() || busy) return;
    setBusy(true);
    setResults(Object.fromEntries(VARIANTS.map((v) => [v.id, { loading: true }])));
    // Sequential calls reduce peak load and make per-model errors easier to inspect.
    for (const item of VARIANTS) {
      try {
        const response = await fetch("/api/google-search", {
          method: "POST", cache: "no-store",
          headers: { "Content-Type": "application/json", "x-search-lab-key": key },
          body: JSON.stringify({ question: question.trim(), lang, labMode: item.id }),
        });
        const data = await response.json();
        setResults((prev) => ({ ...prev, [item.id]: response.ok && data.ok
          ? { data }
          : { error: typeof data.error === "string" ? data.error : "Google 요청 실패" } }));
      } catch (error) {
        setResults((prev) => ({ ...prev, [item.id]: { error: error.message || "연결 오류" } }));
      }
    }
    setBusy(false);
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px 14px 70px", background: "#edf3f7", color: "#172b3f", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "auto" }}>
        <a href="/" style={{ color: "#14785f", fontSize: 13, fontWeight: 700 }}>← 기존 챗봇으로 돌아가기</a>
        <h1 style={{ fontSize: 27, margin: "14px 0 4px" }}>Flash 속도·검색 품질 비교 v6.2</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          같은 Gemini Flash 모델에서 LOW / MINIMAL / MINIMAL + 간결 답변을 비교해. 실제 검색어, 토큰 사용량과 모델 비용 추정치도 보여줘.
        </p>
        <form onSubmit={compare} style={{ ...panel, display: "grid", gap: 14, marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>
            질문
            <textarea style={{ ...inputStyle, display: "block", marginTop: 6, resize: "vertical" }} rows={2}
              maxLength={500} value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXAMPLES.map((s, i) => <button key={i} type="button" onClick={() => setQuestion(s)}
              style={{ padding: "7px 10px", border: "1px solid #bed6d0", borderRadius: 999, background: "#f1faf6", color: "#215d4a", fontSize: 12, cursor: "pointer" }}>
              {s}
            </button>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              답변 언어
              <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ ...inputStyle, marginTop: 6 }}>
                <option value="ko">한국어</option><option value="en">English</option>
                <option value="ja">日本語</option><option value="zh">中文</option>
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              테스트 비밀번호 (SEARCH_LAB_KEY)
              <input type="password" autoComplete="off" style={{ ...inputStyle, marginTop: 6 }}
                value={key} onChange={(e) => setKey(e.target.value)} placeholder="Vercel에 설정한 값" />
            </label>
          </div>
          <button type="submit" disabled={busy || !question.trim() || !key.trim()}
            style={{ ...button, opacity: busy ? 0.65 : 1 }}>
            {busy ? "Flash 세 설정을 순서대로 테스트하는 중…" : "Flash 설정 3가지 비교 시작"}
          </button>
          <p style={{ fontSize: 12, margin: 0, color: "#7c8592" }}>
            테스트 한 번에 Flash 호출이 최대 3회 발생해. 모델 비용은 글로벌 일반 요금·사용량 기반 추정치이며 검색 Grounding 요금은 포함되지 않아.
            실제 청구금액은 Vertex AI 결제 내역에서 확인해. 기존 메인 챗봇은 변경되지 않고, 비밀번호는 브라우저 화면에만 임시 보관돼.
          </p>
        </form>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 12, alignItems: "start" }}>
          {VARIANTS.map((item) => <Result key={item.id} item={item} state={results[item.id]} />)}
        </div>
        <p style={{ color: "#64748b", fontSize: 12, marginTop: 22 }}>
          판단 팁: 검색어가 없거나 출처가 없는 답은 추측 가능성이 높아. 검색 근거가 있어도 현장 안내로 쓰려면 출처와 시설 위치를 확인해야 해.
        </p>
      </div>
    </main>
  );
}
