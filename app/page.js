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
    status: "길찾기 테스트",
    bannerTitle: "승객 안내 테스트 페이지",
    bannerBody: "길찾기는 Google 검색 결과로 연결됩니다. OpenAI API는 아직 사용하지 않습니다.",
    quick: "빠른 안내",
    placeholder: "궁금한 것을 입력하세요",
    routePlaceholder: "목적지를 입력하세요 (예: 명동)",
    send: "전송",
    greeting: "안녕하세요. 역 안내 테스트입니다. 무엇을 도와드릴까요?",
    routePrompt: "목적지를 입력해주세요. 예: 명동, 서울역, 강남",
    routeFound: (dest) => `${dest}까지 지하철 경로를 Google에서 확인할 수 있어요.`,
    routeButton: "Google에서 지하철 경로 보기",
    route: "길찾기",
    restroom: "화장실",
    ticket: "승차권·카드",
    exit: "출구 안내",
    elevator: "엘리베이터",
    staff: "역무원 문의",
    generic: "현재는 화면 동작 테스트 단계예요. 이 항목은 다음 단계에서 실제 역 정보와 연결할 예정입니다.",
  },
  en: {
    title: "AI Guide",
    status: "Route test",
    bannerTitle: "Passenger guide test page",
    bannerBody: "Route searches open in Google. OpenAI API is not being used yet.",
    quick: "Quick guide",
    placeholder: "Type your question",
    routePlaceholder: "Enter destination (e.g. Myeong-dong)",
    send: "Send",
    greeting: "Hello. This is a station guide test. How can I help?",
    routePrompt: "Enter your destination. Example: Myeong-dong, Seoul Station, Gangnam",
    routeFound: (dest) => `You can check the subway route to ${dest} on Google.`,
    routeButton: "View subway route on Google",
    route: "Route",
    restroom: "Restroom",
    ticket: "Ticket · Card",
    exit: "Exit guide",
    elevator: "Elevator",
    staff: "Ask staff",
    generic: "This is currently a UI test. This item will be connected to real station information in the next step.",
  },
  ja: {
    title: "AI案内",
    status: "経路テスト",
    bannerTitle: "乗客案内テストページ",
    bannerBody: "経路検索はGoogle検索結果を開きます。OpenAI APIはまだ使用しません。",
    quick: "クイック案内",
    placeholder: "質問を入力してください",
    routePlaceholder: "目的地を入力（例：明洞）",
    send: "送信",
    greeting: "こんにちは。駅案内のテストです。何をお手伝いしましょうか？",
    routePrompt: "目的地を入力してください。例：明洞、ソウル駅、江南",
    routeFound: (dest) => `${dest}までの地下鉄経路をGoogleで確認できます。`,
    routeButton: "Googleで地下鉄経路を見る",
    route: "経路検索",
    restroom: "トイレ",
    ticket: "乗車券・カード",
    exit: "出口案内",
    elevator: "エレベーター",
    staff: "駅員に相談",
    generic: "現在は画面動作のテスト段階です。この項目は次の段階で実際の駅情報に接続します。",
  },
  zh: {
    title: "AI 안내",
    status: "路线测试",
    bannerTitle: "乘客指南测试页面",
    bannerBody: "路线搜索会打开 Google 搜索结果，目前尚未使用 OpenAI API。",
    quick: "快捷指南",
    placeholder: "请输入问题",
    routePlaceholder: "请输入目的地（例如：明洞）",
    send: "发送",
    greeting: "您好，这是车站指南测试。请问需要什么帮助？",
    routePrompt: "请输入目的地。例如：明洞、首尔站、江南",
    routeFound: (dest) => `可以在 Google 上查看前往${dest}的地铁路线。`,
    routeButton: "在 Google 查看地铁路线",
    route: "路线",
    restroom: "洗手间",
    ticket: "车票·交通卡",
    exit: "出口指南",
    elevator: "电梯",
    staff: "咨询站务员",
    generic: "目前处于界面测试阶段。下一步会把此项目连接到真实的车站信息。",
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

export default function Home() {
  const [lang, setLang] = useState("ko");
  const [mode, setMode] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: TEXT.ko.greeting },
  ]);

  const t = TEXT[lang];

  function changeLanguage(nextLang) {
    setLang(nextLang);
    setMode(null);
    setInput("");
    setMessages([{ role: "assistant", text: TEXT[nextLang].greeting }]);
  }

  function addPair(userText, assistantText) {
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      { role: "assistant", text: assistantText },
    ]);
  }

  function quickAction(type, label) {
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
    addPair(label, t.generic);
  }

  function submitMessage(event) {
    event.preventDefault();
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

    addPair(raw, t.generic);
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
          <div className="sag-status"><span />{t.status}</div>
        </header>

        <div className="sag-languages">
          {LANGUAGE_BUTTONS.map(([code, label]) => (
            <button
              key={code}
              className={lang === code ? "active" : ""}
              onClick={() => changeLanguage(code)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="sag-banner">
          <strong>{t.bannerTitle}</strong>
          <span>{t.bannerBody}</span>
        </div>

        <div className="sag-section-title">{t.quick}</div>
        <div className="sag-actions">
          {actions.map(([type, icon, label]) => (
            <button key={type} onClick={() => quickAction(type, label)}>
              <span className="sag-action-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="sag-chat">
          {messages.map((message, index) => (
            <div key={index} className={`sag-row ${message.role}`}>
              <div className={`sag-bubble ${message.role}`}>
                <div>{message.text}</div>
                {message.url && (
                  <>
                    <a className="sag-google-button" href={message.url} target="_blank" rel="noopener noreferrer">
                      🔎 {message.linkLabel}
                    </a>
                    <div className="sag-query">{message.query}</div>
                  </>
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
          />
          <button type="submit">{t.send}</button>
        </form>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: #eef4f8; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #14202b; }
        button, input { font: inherit; }
        .sag-page { min-height: 100vh; display: flex; justify-content: center; padding: 24px 12px; background: #eef4f8; }
        .sag-phone { width: 100%; max-width: 520px; min-height: calc(100vh - 48px); background: white; border-radius: 28px; box-shadow: 0 14px 45px rgba(28, 55, 78, .12); overflow: hidden; display: flex; flex-direction: column; }
        .sag-header { padding: 24px 24px 18px; border-bottom: 1px solid #e6edf2; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
        .sag-kicker { color: #0c7a61; font-size: 12px; font-weight: 800; letter-spacing: 1.8px; }
        .sag-header h1 { margin: 5px 0 0; font-size: 27px; letter-spacing: -1px; }
        .sag-status { white-space: nowrap; color: #6b7883; font-size: 13px; padding-top: 4px; }
        .sag-status span { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; background: #f2a51a; }
        .sag-languages { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 14px 16px 0; }
        .sag-languages button { border: 1px solid #dfe8ed; background: white; border-radius: 10px; padding: 8px 3px; color: #53616c; cursor: pointer; font-size: 12px; }
        .sag-languages button.active { border-color: #14785f; color: #14785f; background: #eff8f5; font-weight: 700; }
        .sag-banner { margin: 14px 16px 18px; padding: 14px 15px; background: #edf8f4; border-radius: 14px; display: flex; flex-direction: column; gap: 4px; }
        .sag-banner strong { font-size: 14px; }
        .sag-banner span { font-size: 12px; color: #687781; line-height: 1.45; }
        .sag-section-title { padding: 0 16px 10px; font-weight: 800; font-size: 14px; }
        .sag-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 16px 18px; }
        .sag-actions button { min-height: 82px; border: 1px solid #d9e4ea; border-radius: 14px; background: white; cursor: pointer; color: #17232d; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font-weight: 700; font-size: 13px; }
        .sag-actions button:active { transform: scale(.98); background: #f7fafb; }
        .sag-action-icon { font-size: 22px; }
        .sag-chat { flex: 1; padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 9px; overflow-y: auto; min-height: 260px; }
        .sag-row { display: flex; width: 100%; }
        .sag-row.user { justify-content: flex-end; }
        .sag-row.assistant { justify-content: flex-start; }
        .sag-bubble { max-width: 82%; border-radius: 15px; padding: 11px 13px; line-height: 1.45; font-size: 14px; }
        .sag-bubble.assistant { background: #f0f4f6; color: #2c3943; border-bottom-left-radius: 5px; }
        .sag-bubble.user { background: #14785f; color: white; border-bottom-right-radius: 5px; }
        .sag-google-button { margin-top: 10px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; background: white; color: #11694f; border: 1px solid #a9d7c9; border-radius: 10px; padding: 10px 12px; font-weight: 800; font-size: 13px; }
        .sag-query { margin-top: 8px; font-size: 11px; color: #7b8992; word-break: keep-all; }
        .sag-input-wrap { position: sticky; bottom: 0; background: white; border-top: 1px solid #e5edf1; padding: 12px 14px calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 8px; }
        .sag-input-wrap input { flex: 1; min-width: 0; border: 1px solid #d5e0e6; border-radius: 12px; padding: 12px 13px; outline: none; color: #18242e; }
        .sag-input-wrap input:focus { border-color: #14785f; box-shadow: 0 0 0 3px rgba(20, 120, 95, .08); }
        .sag-input-wrap button { border: 0; border-radius: 12px; padding: 0 17px; background: #9dc9bd; color: white; font-weight: 800; cursor: pointer; }
        .sag-input-wrap button:active { background: #14785f; }
        @media (max-width: 560px) {
          .sag-page { padding: 0; }
          .sag-phone { max-width: none; min-height: 100vh; border-radius: 0; box-shadow: none; }
          .sag-header { padding-top: calc(18px + env(safe-area-inset-top)); }
          .sag-header h1 { font-size: 24px; }
          .sag-actions button { min-height: 76px; }
        }
      `}</style>
    </main>
  );
}
