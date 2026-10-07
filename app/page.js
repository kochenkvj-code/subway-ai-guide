"use client";

import { useState } from "react";

const STATION = {
  ko: "종로5가역",
  en: "Jongno 5-ga Station",
  ja: "鍾路5街駅",
  zh: "钟路5街站",
};

const TEXT = {
  ko: {
    title: "AI 안내",
    status: "AI 안내 운영중",
    bannerTitle: "종로5가역 AI 안내",
    bannerBody: "역 관련 일반 문의는 Google 검색을 바탕으로 안내합니다. 길찾기는 별도 Google 검색으로 연결됩니다.",
    quick: "빠른 안내",
    placeholder: "궁금한 것을 입력하세요",
    routePlaceholder: "목적지를 입력하세요 (예: 명동)",
    send: "전송",
    greeting: "안녕하세요. 종로5가역 AI 안내입니다. 무엇을 도와드릴까요?",
    routePrompt: "목적지를 입력해주세요. 예: 명동, 서울역, 강남",
    routeFound: (dest) => `${dest}까지 지하철 경로를 Google에서 확인할 수 있어요.`,
    routeButton: "Google에서 지하철 경로 보기",
    route: "길찾기",
    restroom: "화장실",
    ticket: "승차권·카드",
    exit: "출구 안내",
    elevator: "엘리베이터",
    staff: "역무원 문의",
    loading: "AI가 답변을 생성하고 있습니다…",
    error: "검색 기반 답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    sources: "출처",
    source: "출처",
  },
  en: {
    title: "AI Guide",
    status: "AI Guide Online",
    bannerTitle: "Jongno 5-ga Station AI Guide",
    bannerBody: "General station questions use Google Search grounding. Route searches open separately in Google.",
    quick: "Quick guide",
    placeholder: "Type your question",
    routePlaceholder: "Enter destination (e.g. Myeong-dong)",
    send: "Send",
    greeting: "Hello. This is the Jongno 5-ga Station AI Guide. How can I help?",
    routePrompt: "Enter your destination. Example: Myeong-dong, Seoul Station, Gangnam",
    routeFound: (dest) => `You can check the subway route to ${dest} on Google.`,
    routeButton: "View subway route on Google",
    route: "Route",
    restroom: "Restroom",
    ticket: "Ticket · Card",
    exit: "Exit guide",
    elevator: "Elevator",
    staff: "Ask staff",
    loading: "AI is generating an answer…",
    error: "I couldn't load a search-grounded answer. Please try again.",
    sources: "Sources",
    source: "Source",
  },
  ja: {
    title: "AI案内",
    status: "AI案内 稼働中",
    bannerTitle: "鍾路5街駅 AI案内",
    bannerBody: "駅に関する一般的な質問はGoogle検索をもとに案内します。経路検索はGoogle検索を別に開きます。",
    quick: "クイック案内",
    placeholder: "質問を入力してください",
    routePlaceholder: "目的地を入力（例：明洞）",
    send: "送信",
    greeting: "こんにちは。鍾路5街駅AI案内です。何をお手伝いしましょうか？",
    routePrompt: "目的地を入力してください。例：明洞、ソウル駅、江南",
    routeFound: (dest) => `${dest}までの地下鉄経路をGoogleで確認できます。`,
    routeButton: "Googleで地下鉄経路を見る",
    route: "経路検索",
    restroom: "トイレ",
    ticket: "乗車券・カード",
    exit: "出口案内",
    elevator: "エレベーター",
    staff: "駅員に相談",
    loading: "AIが回答を生成しています…",
    error: "検索に基づく回答を読み込めませんでした。もう一度お試しください。",
    sources: "出典",
    source: "出典",
  },
  zh: {
    title: "AI 안내",
    status: "AI 指南运行中",
    bannerTitle: "钟路5街站 AI 指南",
    bannerBody: "一般车站问题会参考 Google 搜索进行回答，路线查询会单独打开 Google 搜索。",
    quick: "快捷指南",
    placeholder: "请输入问题",
    routePlaceholder: "请输入目的地（例如：明洞）",
    send: "发送",
    greeting: "您好，这里是钟路5街站 AI 指南。请问需要什么帮助？",
    routePrompt: "请输入目的地。例如：明洞、首尔站、江南",
    routeFound: (dest) => `可以在 Google 上查看前往${dest}的地铁路线。`,
    routeButton: "在 Google 查看地铁路线",
    route: "路线",
    restroom: "洗手间",
    ticket: "车票·交通卡",
    exit: "出口指南",
    elevator: "电梯",
    staff: "咨询站务员",
    loading: "AI 正在生成回答…",
    error: "无法加载基于搜索的回答，请稍后重试。",
    sources: "来源",
    source: "来源",
  },
};

const LANGUAGE_BUTTONS = [
  ["ko", "한국어"],
  ["en", "English"],
  ["ja", "日本語"],
  ["zh", "中文"],
];

function normalizeDestination(value, lang) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (lang === "ko") return trimmed.endsWith("역") ? trimmed : `${trimmed}역`;
  if (lang === "en") return /station$/i.test(trimmed) ? trimmed : `${trimmed} Station`;
  if (lang === "ja") return trimmed.endsWith("駅") ? trimmed : `${trimmed}駅`;
  if (lang === "zh") return trimmed.endsWith("站") ? trimmed : `${trimmed}站`;
  return trimmed;
}

function buildGoogleQuery(origin, destination, lang) {
  if (lang === "en") return `How to get from ${origin} to ${destination} by subway`;
  if (lang === "ja") return `${origin}から${destination}まで地下鉄で行く方法`;
  if (lang === "zh") return `从${origin}到${destination}怎么坐地铁`;
  return `${origin}에서 ${destination}까지 지하철로 가는법`;
}

function quickQuestion(type, lang) {
  const q = {
    restroom: {
      ko: "화장실은 어디에 있나요?",
      en: "Where is the restroom?",
      ja: "トイレはどこですか？",
      zh: "洗手间在哪里？",
    },
    ticket: {
      ko: "승차권이나 교통카드에 오류가 났을 때 어떻게 해야 하나요?",
      en: "What should I do if my ticket or transit card has an error?",
      ja: "乗車券や交通カードでエラーが出た場合はどうすればいいですか？",
      zh: "车票或交通卡出现错误时该怎么办？",
    },
    exit: {
      ko: "출구 위치와 주요 출구 안내를 해주세요.",
      en: "Please explain the station exits and their locations.",
      ja: "出口の場所と主な出口を案内してください。",
      zh: "请介绍各出口的位置。",
    },
    elevator: {
      ko: "엘리베이터는 어디에 있나요?",
      en: "Where is the elevator?",
      ja: "エレベーターはどこですか？",
      zh: "电梯在哪里？",
    },
    staff: {
      ko: "역무실은 어디에 있고 역무원에게 어떻게 문의하나요?",
      en: "Where is the station office and how can I ask station staff for help?",
      ja: "駅務室はどこにあり、駅員にはどう相談できますか？",
      zh: "站务室在哪里，如何向站务员求助？",
    },
  };

  return q[type]?.[lang] || "";
}

export default function Home() {
  const [lang, setLang] = useState("ko");
  const [mode, setMode] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: TEXT.ko.greeting },
  ]);

  const t = TEXT[lang];

  function changeLanguage(nextLang) {
    setLang(nextLang);
    setMode(null);
    setInput("");
    setLoading(false);
    setMessages([{ role: "assistant", text: TEXT[nextLang].greeting }]);
  }

  async function askGoogle(question, visibleUserText = question) {
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: visibleUserText },
      { role: "assistant", text: t.loading, pending: true },
    ]);

    try {
      const response = await fetch("/api/google-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          question,
          lang,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Search request failed");
      }

      setMessages((prev) => {
        const next = [...prev];
        const pendingIndex = next.findLastIndex((m) => m.pending);

        const message = {
          role: "assistant",
          text: data.answer,
          sources: data.sources || [],
          searchSuggestion: data.searchSuggestion || null,
        };

        if (pendingIndex >= 0) {
          next[pendingIndex] = message;
        } else {
          next.push(message);
        }

        return next;
      });
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const pendingIndex = next.findLastIndex((m) => m.pending);

        const message = {
          role: "assistant",
          text: t.error,
          error: true,
        };

        if (pendingIndex >= 0) {
          next[pendingIndex] = message;
        } else {
          next.push(message);
        }

        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  function quickAction(type, label) {
    if (loading) return;

    if (type === "route") {
      setMode("route");
      setMessages((prev) => [
        ...prev,
        { role: "user", text: label },
        { role: "assistant", text: t.routePrompt },
      ]);
      return;
    }

    setMode(null);
    const question = quickQuestion(type, lang);
    askGoogle(question, label);
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (loading) return;

    const raw = input.trim();
    if (!raw) return;

    setInput("");

    if (mode === "route") {
      const destination = normalizeDestination(raw, lang);
      const query = buildGoogleQuery(STATION[lang], destination, lang);
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=${lang}`;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: raw },
        {
          role: "assistant",
          text: t.routeFound(destination),
          url,
          linkLabel: t.routeButton,
          query,
        },
      ]);

      setMode(null);
      return;
    }

    await askGoogle(raw);
  }

  const actions = [
    ["restroom", "🚻", t.restroom],
    ["route", "🚇", t.route],
    ["ticket", "🎫", t.ticket],
    ["exit", "🚪", t.exit],
    ["elevator", "♿", t.elevator],
    ["staff", "👨‍✈️", t.staff],
  ];

  return (
    <main className="sag-page">
      <section className="sag-phone">
        <header className="sag-header">
          <div>
            <div className="sag-kicker">SUBWAY AI GUIDE</div>
            <h1>{STATION[lang]} {t.title}</h1>
          </div>
          <div className="sag-status">
            <span className={loading ? "loading" : ""} />
            {t.status}
          </div>
        </header>

        <div className="sag-languages">
          {LANGUAGE_BUTTONS.map(([code, label]) => (
            <button
              key={code}
              className={lang === code ? "active" : ""}
              onClick={() => changeLanguage(code)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="sag-section-title">{t.quick}</div>

        <div className="sag-actions">
          {actions.map(([type, icon, label]) => (
            <button
              key={type}
              onClick={() => quickAction(type, label)}
              disabled={loading}
            >
              <span className="sag-action-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="sag-chat">
          {messages.map((message, index) => (
            <div key={index} className={`sag-row ${message.role}`}>
              <div className={`sag-bubble ${message.role} ${message.pending ? "pending" : ""}`}>
                <div className="sag-answer">{message.text}</div>

                {message.url && (
                  <>
                    <a
                      className="sag-google-button"
                      href={message.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🔎 {message.linkLabel}
                    </a>
                    <div className="sag-query">{message.query}</div>
                  </>
                )}

                {message.searchSuggestion && (
                  <div
                    className="sag-search-suggestion"
                    dangerouslySetInnerHTML={{ __html: message.searchSuggestion }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <form className="sag-input-wrap" onSubmit={submitMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "route" ? t.routePlaceholder : t.placeholder}
            aria-label="message"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "…" : t.send}
          </button>
        </form>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: #eef4f8; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #14202b; }
        button, input { font: inherit; }
        button:disabled, input:disabled { opacity: .62; cursor: default; }

        .sag-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 24px 12px;
          background: #eef4f8;
        }

        .sag-phone {
          width: 100%;
          max-width: 520px;
          min-height: calc(100vh - 48px);
          background: white;
          border-radius: 28px;
          box-shadow: 0 14px 45px rgba(28, 55, 78, .12);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .sag-header {
          padding: 24px 24px 18px;
          border-bottom: 1px solid #e6edf2;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .sag-kicker {
          color: #0c7a61;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .sag-header h1 {
          margin: 5px 0 0;
          font-size: 27px;
          letter-spacing: -1px;
        }

        .sag-status {
          white-space: nowrap;
          color: #6b7883;
          font-size: 13px;
          padding-top: 4px;
        }

        .sag-status span {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin-right: 6px;
          border-radius: 50%;
          background: #20a675;
        }

        .sag-status span.loading {
          background: #f2a51a;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: .35; }
          50% { opacity: 1; }
        }

        .sag-languages {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          padding: 14px 16px 0;
        }

        .sag-languages button {
          border: 1px solid #dfe8ed;
          background: white;
          border-radius: 10px;
          padding: 8px 3px;
          color: #53616c;
          cursor: pointer;
          font-size: 12px;
        }

        .sag-languages button.active {
          border-color: #14785f;
          color: #14785f;
          background: #eff8f5;
          font-weight: 700;
        }

        .sag-section-title {
          padding: 18px 16px 10px;
          font-weight: 800;
          font-size: 14px;
        }

        .sag-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 0 16px 18px;
        }

        .sag-actions button {
          min-height: 82px;
          border: 1px solid #d9e4ea;
          border-radius: 14px;
          background: white;
          cursor: pointer;
          color: #17232d;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-weight: 700;
          font-size: 13px;
        }

        .sag-actions button:active {
          transform: scale(.98);
          background: #f7fafb;
        }

        .sag-action-icon { font-size: 22px; }

        .sag-chat {
          flex: 1;
          padding: 4px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          overflow-y: auto;
          min-height: 260px;
        }

        .sag-row {
          display: flex;
          width: 100%;
        }

        .sag-row.user { justify-content: flex-end; }
        .sag-row.assistant { justify-content: flex-start; }

        .sag-bubble {
          max-width: 86%;
          border-radius: 15px;
          padding: 11px 13px;
          line-height: 1.5;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .sag-bubble.assistant {
          background: #f0f4f6;
          color: #2c3943;
          border-bottom-left-radius: 5px;
        }

        .sag-bubble.user {
          background: #14785f;
          color: white;
          border-bottom-right-radius: 5px;
        }

        .sag-bubble.pending {
          color: #687781;
        }

        .sag-answer {
          white-space: pre-wrap;
        }

        .sag-google-button {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          background: white;
          color: #11694f;
          border: 1px solid #a9d7c9;
          border-radius: 10px;
          padding: 10px 12px;
          font-weight: 800;
          font-size: 13px;
        }

        .sag-query {
          margin-top: 8px;
          font-size: 11px;
          color: #7b8992;
          word-break: keep-all;
        }

        .sag-search-suggestion {
          margin-top: 10px;
          overflow: hidden;
        }

        .sag-input-wrap {
          position: sticky;
          bottom: 0;
          background: white;
          border-top: 1px solid #e5edf1;
          padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
          display: flex;
          gap: 8px;
        }

        .sag-input-wrap input {
          flex: 1;
          min-width: 0;
          border: 1px solid #d5e0e6;
          border-radius: 12px;
          padding: 12px 13px;
          outline: none;
          color: #18242e;
          background: white;
        }

        .sag-input-wrap input:focus {
          border-color: #14785f;
          box-shadow: 0 0 0 3px rgba(20, 120, 95, .08);
        }

        .sag-input-wrap button {
          border: 0;
          border-radius: 12px;
          padding: 0 17px;
          background: #14785f;
          color: white;
          font-weight: 800;
          cursor: pointer;
          min-width: 62px;
        }

        @media (max-width: 560px) {
          .sag-page { padding: 0; }
          .sag-phone {
            max-width: none;
            min-height: 100vh;
            border-radius: 0;
            box-shadow: none;
          }
          .sag-header {
            padding-top: calc(18px + env(safe-area-inset-top));
          }
          .sag-header h1 { font-size: 24px; }
          .sag-actions button { min-height: 76px; }
        }
      `}</style>
    </main>
  );
}
