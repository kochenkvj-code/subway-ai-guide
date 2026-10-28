"use client";
import { useState } from 'react';
export default function TourTest() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true); setError(''); setData(null);
    try {
      const response = await fetch('/api/tour-test', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '조회 실패');
      setData(result);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  return <main className="tour"><a href="/">← 역 안내로</a><header><small>TOUR API · TEST LAB</small><h1>종로5가 주변 둘러보기</h1><p>한국관광공사 관광정보로 주변 장소를 찾아보세요.</p><span>기준 위치: 종로5가역 인근 좌표 · 반경 1.5km</span></header><button onClick={load} disabled={loading}>{loading ? '관광정보 불러오는 중…' : '주변 관광정보 조회'}</button><p className="note">실제 API 조회 테스트입니다. 키는 서버에서만 사용하며, 거리는 도보 이동 거리가 아닙니다.</p>{error && <div role="alert" className="error">{error}</div>}{data && <><p role="status">총 {data.total}건 중 {data.items.length}건 표시</p>{!data.items.length && <p>이 범위에서 조회된 장소가 없습니다.</p>}<section>{data.items.map((x,i) => <article key={x.id || i}>{x.image ? <img src={x.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <div className="placeholder">관광정보</div>}<div className="body"><small>{x.distance ? `기준점에서 약 ${Math.round(Number(x.distance))}m` : '주변 장소'}</small><h2>{x.title}</h2><p>{x.address || '주소 정보 없음'}</p><a href={`https://map.naver.com/p/search/${encodeURIComponent(x.title + ' ' + x.address)}`} target="_blank" rel="noopener noreferrer">지도에서 보기 ↗</a></div></article>)}</section></>}</main>;
}
