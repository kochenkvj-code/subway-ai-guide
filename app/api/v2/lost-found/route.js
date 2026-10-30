// Read-only LOST112 search proxy. Never send service keys or upstream URLs to the browser.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;
const PROVIDERS = {
  portal: {
    label: '포털기관',
    env: 'LOST112_PORTAL_API_KEY',
    url: 'https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd',
  },
  police: {
    label: '경찰관서',
    env: 'LOST112_POLICE_API_KEY',
    url: 'https://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd',
  },
};
const reply = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const dt = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === value;
}
function textOf(value) {
  return String(value || '').replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1')
    .replace(/&#x([\da-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x,16)))
    .replace(/&#(\d+);/g, (_, x) => String.fromCodePoint(Number(x)))
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
    .replace(/&apos;/g,"'").replace(/&amp;/g,'&').trim();
}
function tag(source, name) {
  const match = String(source).match(new RegExp('<(?:[\\w.-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?'+name+'>','i'));
  return match ? textOf(match[1]) : '';
}
function itemRows(xml) {
  return [...xml.matchAll(/<(?:[\w.-]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?item>/gi)].map(([_, block]) => {
    const result = {};
    for (const match of block.matchAll(/<([\w:.-]+)(?:\s[^>]*)?>([^<]*|<!\[CDATA\[[\s\S]*?\]\]>)<\/\1>/g)) {
      result[match[1].split(':').pop()] = textOf(match[2]);
    }
    return result;
  }).filter(x => Object.keys(x).length);
}
function safeImage(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:','https:'].includes(url.protocol)) return '';
    url.protocol = 'https:';
    return url.href.slice(0, 700);
  } catch { return ''; }
}
function normalized(row, source) {
  return {
    id: String(row.atcId || '').slice(0, 50),
    sequence: String(row.fdSn || '').slice(0, 10),
    source,
    title: String(row.fdPrdtNm || row.fdSbjt || '이름 미등록 습득물').slice(0, 180),
    subject: String(row.fdSbjt || '').slice(0, 320),
    category: String(row.prdtClNm || '').slice(0, 120),
    color: String(row.clrNm || '').slice(0, 80),
    date: String(row.fdYmd || '').slice(0, 20),
    place: String(row.depPlace || '').slice(0, 160),
    image: safeImage(row.fdFilePathImg),
  };
}
async function loadOne(id, start, end, page) {
  const provider = PROVIDERS[id];
  const key = process.env[provider.env]?.trim();
  if (!key) throw new Error('KEY_NOT_CONFIGURED');
  const url = new URL(provider.url);
  url.searchParams.set('serviceKey', key);
  url.searchParams.set('START_YMD', start.replaceAll('-', ''));
  url.searchParams.set('END_YMD', end.replaceAll('-', ''));
  url.searchParams.set('pageNo', String(page));
  url.searchParams.set('numOfRows', String(PAGE_SIZE));
  const result = await fetch(url, { cache:'no-store', signal: AbortSignal.timeout(13500) });
  if (!result.ok) throw new Error('UPSTREAM_HTTP_' + result.status);
  const xml = await result.text();
  if (xml.length > 1500000) throw new Error('RESPONSE_TOO_LARGE');
  const code = tag(xml, 'resultCode');
  const altCode = tag(xml, 'returnReasonCode');
  if (altCode && altCode !== '00') throw new Error('UPSTREAM_AUTH_ERROR');
  if (code !== '00' && code !== '0') throw new Error(code ? 'UPSTREAM_RESULT_' + code.slice(0,8) : 'INVALID_XML_RESPONSE');
  if (!/<(?:[\w.-]+:)?body(?:\s|>)/i.test(xml)) throw new Error('INVALID_XML_RESPONSE');
  const rows = itemRows(xml);
  const totalText = tag(xml, 'totalCount');
  const total = /^\d+$/.test(totalText) ? Number(totalText) : null;
  return {
    items: rows.map(row => normalized(row, id)),
    total,
    hasMore: total !== null ? page * PAGE_SIZE < total : rows.length >= PAGE_SIZE,
  };
}
export async function GET(request) {
  const query = new URL(request.url).searchParams;
  const start = query.get('start') || '', end = query.get('end') || '';
  const source = query.get('source') || 'both';
  const rawPage = query.get('page') || '1';
  const page = Number(rawPage);
  if (!validDate(start) || !validDate(end) || start > end ||
      (Date.parse(end) - Date.parse(start)) / 86400000 > 90 ||
      !['both','portal','police'].includes(source) ||
      !/^\d+$/.test(rawPage) || !Number.isInteger(page) || page < 1 || page > 20) {
    return reply({ ok:false, error:'INVALID_FILTER', message:'검색 기간(최대 90일) 또는 조회 조건을 확인해 주세요.' }, 400);
  }
  const ids = source === 'both' ? ['portal','police'] : [source];
  const resolved = await Promise.allSettled(ids.map(id => loadOne(id, start, end, page)));
  const status = {}, items = [], errors = [];
  resolved.forEach((result, i) => {
    const id = ids[i];
    if (result.status === 'fulfilled') {
      status[id] = { ok:true, label:PROVIDERS[id].label, count:result.value.items.length, total:result.value.total, hasMore:result.value.hasMore };
      items.push(...result.value.items);
    } else {
      // Only expose safe internal codes, never upstream text, URLs, or credentials.
      const reason = String(result.reason?.message || '');
      const error = reason === 'KEY_NOT_CONFIGURED' ? 'KEY_NOT_CONFIGURED' :
        reason.includes('TIMEOUT') || result.reason?.name === 'TimeoutError' ? 'TIMEOUT' :
        reason.startsWith('UPSTREAM_HTTP') ? 'UPSTREAM_HTTP' :
        reason.startsWith('UPSTREAM_RESULT') ? 'UPSTREAM_RESULT' : 'LOOKUP_FAILED';
      errors.push({ source:id, label:PROVIDERS[id].label, error });
      status[id] = { ok:false, label:PROVIDERS[id].label, error };
    }
  });
  if (errors.length === ids.length) {
    const missing = errors.every(x => x.error === 'KEY_NOT_CONFIGURED');
    return reply({ ok:false, error:missing ? 'API_KEY_MISSING' : 'ALL_SOURCES_FAILED', errors, status }, missing ? 503 : 502);
  }
  const seen = new Set();
  const unique = items.filter(item => {
    const key = item.id && item.sequence ? item.id + '|' + item.sequence : item.source + '|' + item.title + '|' + item.date;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b) => b.date.localeCompare(a.date));
  return reply({
    ok:true, items:unique, status, errors, partial:errors.length > 0,
    hasMore:ids.some(id => status[id]?.hasMore),
    page, pageSize:PAGE_SIZE, start, end,
    note:'목록 조회 API입니다. 물품명 검색은 불러온 결과 내에서 적용됩니다.',
  });
}
