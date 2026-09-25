'use client';

import { useMemo, useState } from 'react';

const quickQuestions = [
  { icon: '🚻', label: '화장실', question: '화장실은 어디에 있나요?' },
  { icon: '🚇', label: '길찾기', question: '다른 역으로 가는 방법을 알려주세요.' },
  { icon: '🎫', label: '승차권·카드', question: '교통카드나 승차권에 오류가 났어요.' },
  { icon: '🚪', label: '출구 안내', question: '출구 위치를 알려주세요.' },
  { icon: '♿', label: '엘리베이터', question: '엘리베이터는 어디에 있나요?' },
  { icon: '👨‍✈️', label: '역무원 문의', question: '역무원의 도움이 필요해요.' },
];

function getDemoReply(text) {
  const q = text.toLowerCase();
  if (q.includes('화장실')) return '현재는 화면 테스트 단계예요. 다음 단계에서 이 역의 실제 화장실 위치 정보를 연결할게요.';
  if (q.includes('엘리베이터')) return '엘리베이터 위치도 역 정보 파일에 넣어 정확하게 안내하도록 만들 예정이에요.';
  if (q.includes('승차권') || q.includes('카드') || q.includes('오류')) return '승차권·교통카드 오류 유형별 안내를 다음 단계에서 연결할 수 있어요.';
  if (q.includes('출구')) return '출구별 주요 시설과 이동 방향을 역 데이터로 연결할 예정이에요.';
  if (q.includes('역무원')) return '긴급하거나 현장 확인이 필요한 경우 역무원 안내로 연결하도록 만들 예정이에요.';
  if (q.includes('가') || q.includes('길') || q.includes('역')) return '길찾기는 나중에 공식 노선·경로 데이터와 연결해서 정확하게 안내하도록 만들 수 있어요.';
  return '지금은 API 연결 전 화면 테스트 버전입니다. 페이지와 입력창이 정상 동작하는지만 확인해주세요.';
}

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '안녕하세요. ○○역 AI 안내입니다. 무엇을 도와드릴까요?' },
  ]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  function send(text = input) {
    const clean = text.trim();
    if (!clean) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: clean },
      { role: 'assistant', text: getDemoReply(clean) },
    ]);
    setInput('');
  }

  return (
    <main className="page-shell">
      <section className="phone-card">
        <header className="topbar">
          <div>
            <p className="eyebrow">SUBWAY AI GUIDE</p>
            <h1>○○역 AI 안내</h1>
          </div>
          <div className="status"><span /> 운영 준비중</div>
        </header>

        <div className="notice">
          <strong>승객 안내 테스트 페이지</strong>
          <span>현재는 OpenAI API 연결 전입니다.</span>
        </div>

        <section className="quick-section">
          <h2>빠른 안내</h2>
          <div className="quick-grid">
            {quickQuestions.map((item) => (
              <button key={item.label} className="quick-button" onClick={() => send(item.question)}>
                <span className="quick-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="chat" aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className={`message-row ${message.role}`}>
              <div className="bubble">{message.text}</div>
            </div>
          ))}
        </section>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="궁금한 내용을 입력하세요"
            aria-label="질문 입력"
          />
          <button type="submit" disabled={!canSend}>전송</button>
        </form>

        <footer>
          긴급상황은 AI 안내보다 역무원 호출 또는 현장 안내를 우선해주세요.
        </footer>
      </section>
    </main>
  );
}
