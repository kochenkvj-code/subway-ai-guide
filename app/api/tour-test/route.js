export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const key = process.env.TOUR_API_KEY;
  const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!key) return reply({ error: '서버 환경변수 TOUR_API_KEY에 공공데이터포털의 일반 인증키(Decoding)를 설정해 주세요.' }, 503);
  const url = new URL('https://apis.data.go.kr/B551011/KorService2/locationBasedList2');
  url.search = new URLSearchParams({ serviceKey: key, MobileOS: 'ETC', MobileApp: 'SubwayAIGuide', _type: 'json', mapX: '127.0019', mapY: '37.5709', radius: '1500', arrange: 'E', numOfRows: '20', pageNo: '1' }).toString();
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) return reply({ error: `관광 API HTTP 오류 (${response.status})` }, 502);
    let data;
    try { data = await response.json(); } catch { return reply({ error: 'API가 JSON 대신 다른 형식으로 응답했습니다. 인증키, 활용 신청 승인, API 버전을 확인해 주세요.' }, 502); }
    if (data.response?.header?.resultCode !== '0000') return reply({ error: '관광 API가 요청을 처리하지 못했습니다. 키의 승인 상태와 서비스 버전을 확인해 주세요.', code: data.response?.header?.resultCode || 'UNKNOWN' }, 502);
    const raw = data.response?.body?.items?.item || [];
    const items = (Array.isArray(raw) ? raw : [raw]).map(x => ({ id: x.contentid, title: x.title, address: x.addr1 || '', image: /^https?:\/\//.test(x.firstimage || '') ? x.firstimage.replace(/^http:/, 'https:') : '', distance: x.dist, longitude: x.mapx, latitude: x.mapy }));
    return reply({ items, total: data.response?.body?.totalCount || 0 });
  } catch { return reply({ error: '관광 API 연결에 실패했습니다. 네트워크의 apis.data.go.kr 허용 여부와 응답 시간을 확인해 주세요.' }, 502); }
}
