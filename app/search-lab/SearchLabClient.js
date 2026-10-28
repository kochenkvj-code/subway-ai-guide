"use client";

import { useState } from "react";

const VARIANTS = [
  { id: "comparisonLite", name: "A · Gemini 3.5 Flash-Lite", subtitle: "이전 모델 · LOW 추론" },
  { id: "comparisonFlash38", name: "B · Gemini 3.8 Flash", subtitle: "현재 운영 모델 · LOW 추론" },
];
const EXAMPLES = [
  "종로5가역 근처에 환전소가 어디 있어?",
  "종로5가역 수유실은 어디에 있어?",
  "종로5가역 근처에 약국 있어?",
  "종로5가역에서 가장 가까운 짐 보관 장소 알려줘",
  "종로5가역 내부에 수유실이 있어?",
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
          {lab?.finishReason && lab.finishReason !== "STOP" ? (
            <p style={{ fontSize: 12, color: "#b45309", marginTop: 8 }}>응답 종료 상태: {lab.finishReason} (답변이 잘렸을 수 있음)</p>
          ) : null}
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
        <h1 style={{ fontSize: 27, margin: "14px 0 4px" }}>Gemini 3.5 Flash-Lite vs 3.8 Flash</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          두 모델에 동일한 질문·검색 지시문·Google Search Grounding·LOW 추론·1,600 출력 토큰을 적용해. 답변 품질, 처리 시간, 검색 출처와 모델 비용을 나란히 비교해.
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
            {busy ? "두 모델을 순서대로 비교하는 중…" : "모델 2종 비교 시작"}
          </button>
          <p style={{ fontSize: 12, margin: 0, color: "#7c8592" }}>
            테스트 한 번에 모델별 1회씩 총 2회 호출해. 비교용으로 두 모델의 LOW 추론·출력 한도를 동일하게 맞췄으며, 과거 Lite 운영 설정(기본 추론·500토큰)과는 달라. 모델 비용은 글로벌 일반 요금 추정치이며 Google Search Grounding 요금은 포함되지 않아.
            실제 청구금액은 Vertex AI 결제 내역에서 확인해. 기존 메인 챗봇은 변경되지 않고, 비밀번호는 브라우저 화면에만 임시 보관돼.
          </p>
        </form>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 12, alignItems: "start" }}>
          {VARIANTS.map((item) => <Result key={item.id} item={item} state={results[item.id]} />)}
        </div>
        <p style={{ color: "#64748b", fontSize: 12, marginTop: 22 }}>
          판단 팁: 정확성을 우선해 비교해. 특히 '역무실에서 도움 가능'과 '역 내부에 수유실 있음'은 전혀 다르다는 점을 확인해. 근거가 없는 위치·출구·영업시간은 실제 안내에 사용하지 마.
        </p>
      </div>
    </main>
  );
}
