export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const operations = {
  nearby: 'locationBasedList2', keyword: 'searchKeyword2', area: 'areaBasedList2',
  festival: 'searchFestival2', detail: 'detailCommon2', images: 'detailImage2',
};
const types = new Set(['12','14','15','25','28','32','38','39']);
const photo = value => /^https?:\/\//.test(value || '') ? value.replace(/^http:/, 'https:') : '';
// TourAPI descriptions can contain HTML. Return text, never executable markup.
const plain = value => String(value || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').slice(0, 12000);
const safeLink = value => { const match = String(value || '').match(/https?:\/\/[^\s"'<>]+/i); return match ? match[0] : ''; };
export async function GET(request) {
  const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  const input = new URL(request.url).searchParams;
  const mode = input.get('mode') || 'nearby';
  if (!Object.hasOwn(operations, mode)) return reply({ error: '지원하지 않는 조회 방식입니다.' }, 400);
  const params = new URLSearchParams({ MobileOS: 'ETC', MobileApp: 'SubwayAIGuide', _type: 'json', numOfRows: '20', pageNo: '1' });
  const type = input.get('type') || '';
  if (type && !types.has(type)) return reply({ error: '잘못된 관광 분류입니다.' }, 400);
  if (type && ['nearby','keyword','area'].includes(mode)) params.set('contentTypeId', type);
  if (mode === 'nearby') {
    const radius = input.get('radius') || '1500';
    if (!['500','1500','3000','5000'].includes(radius)) return reply({ error: '지원하지 않는 검색 반경입니다.' }, 400);
    for (const [k,v] of Object.entries({ mapX:'127.0019', mapY:'37.5709', radius, arrange:'E' })) params.set(k,v);
  }
  if (mode === 'keyword') {
    const keyword = (input.get('keyword') || '').trim();
    if (!keyword || keyword.length > 80) return reply({ error: '검색어를 1~80자로 입력해 주세요.' }, 400);
    params.set('keyword', keyword); params.set('arrange','A');
  }
  if (mode === 'area' || mode === 'festival') {
    const area = input.get('area') || '1';
    if (!['1','2','3','4','5','6','7','8','31','32','33','34','35','36','37','38','39'].includes(area)) return reply({ error: '잘못된 지역입니다.' }, 400);
    params.set('areaCode', area); params.set('arrange','A');
  }
  if (mode === 'festival') {
    const start = input.get('start') || '', end = input.get('end') || '';
    const validDate = s => /^\d{8}$/.test(s) && !Number.isNaN(Date.parse(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00Z`));
    if (!validDate(start) || !validDate(end) || start > end) return reply({ error: '올바른 행사 시작·종료 날짜를 선택해 주세요.' }, 400);
    params.set('eventStartDate',start); params.set('eventEndDate',end);
  }
  if (['detail','images'].includes(mode)) {
    const id = input.get('id') || '';
    if (!/^\d{1,15}$/.test(id)) return reply({ error: '올바른 장소 ID가 필요합니다.' }, 400);
    params.set('contentId',id);
    if (mode === 'images') { params.set('imageYN','Y'); }

  }
  const key = process.env.TOUR_API_KEY;
  if (!key) return reply({ error: '서버 환경변수 TOUR_API_KEY에 일반 인증키(Decoding)를 설정해 주세요.' }, 503);
  params.set('serviceKey',key);
  const url = `https://apis.data.go.kr/B551011/KorService2/${operations[mode]}?${params}`;
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) return reply({ error: `관광 API HTTP 오류 (${response.status})` }, 502);
    let data;
    try { data = await response.json(); } catch { return reply({ error: 'API가 JSON 이외의 응답을 반환했습니다. 인증키·활용 승인·서비스 버전을 확인해 주세요.' }, 502); }
    const resultCode = String(data.response?.header?.resultCode ?? data.resultCode ?? 'UNKNOWN');
    if (!['0000', '00'].includes(resultCode)) {
      // Expose a short sanitized provider message for diagnosing image API failures.
      const upstreamMessage = String(data.response?.header?.resultMsg || data.resultMsg || '')
        .replaceAll(key, '[redacted]')
        .replaceAll(encodeURIComponent(key), '[redacted]')
        .replace(/https?:\/\/\S+/g, '[url]').slice(0, 140);
      return reply({
        error: '관광 API 오류 (' + resultCode + ')' + (upstreamMessage ? ': ' + upstreamMessage : ''),
        code: resultCode,
        diagnostics: { rootFields: Object.keys(data || {}), responseFields: Object.keys(data.response || {}), headerFields: Object.keys(data.response?.header || {}) },
      }, 502);
    }
    const raw = data.response?.body?.items?.item || [];
    const list = Array.isArray(raw) ? raw : [raw];
    if (mode === 'images') return reply({ operation: operations[mode], images: list.map(x => ({ title: plain(x.imgname), url: photo(x.originimgurl || x.smallimageurl), credit: plain(x.cpyrhtDivCd || x.copyrightdivcode) })).filter(x => x.url) });
    const items = list.map(x => ({ id: x.contentid, type: x.contenttypeid, title: plain(x.title), address: plain([x.addr1,x.addr2].filter(Boolean).join(' ')), image: photo(x.firstimage), distance: x.dist, longitude: x.mapx, latitude: x.mapy, description: plain(x.overview), phone: plain(x.tel), homepage: safeLink(x.homepage), start: x.eventstartdate || '', end: x.eventenddate || '', credit: plain(x.cpyrhtDivCd) }));
    return reply({ operation: operations[mode], items, total: data.response?.body?.totalCount || 0 });
  } catch { return reply({ error: '관광 API 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 502); }
}
