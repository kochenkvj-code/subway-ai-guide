// Official subway routing helper for the existing Google-search chat endpoint.
// Uses the already deployed /api/subway-route route handler directly:
// no duplicated credentials, no public re-fetch, no Gemini-generated routes.
import { GET as getOfficialSubwayRoute } from "../subway-route/route.js";

const ORIGIN = "종로5가";
const STATION_STOPWORDS = new Set(["지하철", "전철", "도착", "출발", "환승", "역무", "안내", "고객", "인근"]);
const AMBIGUOUS_DESTINATIONS = new Set(["목적지", "지하철", "도착지", "여기", "저기", "역", "노선"]);

const LANG_TEXT = {
  ko: {
    title: "🚇 공식 지하철 경로 안내", duration: "예상 열차 여정", transfers: "환승", fare: "교통카드 요금", distance: "거리",
    ride: (step) => `${withStationSuffix(step.from)} → ${withStationSuffix(step.to)}: ${step.line}${step.direction ? ` ${step.direction}행` : ""} 탑승 (${step.segments}구간)`,
    transfer: (step) => `${withStationSuffix(step.station)} 환승: ${step.fromLine} → ${step.toLine}`,
    first: "첫 열차 출발", last: "목적지 도착 예정", searched: "조회 기준", note: "열차 출발 대기시간은 표시된 열차 여정과 별도일 수 있습니다. 실제 운행 및 추가 운임은 달라질 수 있습니다.",
    need: "도착역 이름을 알려주세요. 예: ‘종로5가역에서 안암역 가는 법’", unsupported: "현재 공식 경로조회는 종로5가역 출발만 지원합니다. 종로5가역에서 출발하는 도착역을 알려주세요.",
    failed: "공식 지하철 경로를 확인하지 못했습니다. 도착역의 정확한 이름을 확인해 다시 입력해 주세요.",
    via: "현재는 경유역을 지정한 경로를 조회할 수 없습니다. 경유역 없이 도착역만 입력해 주세요.",
  },
  en: {
    title: "🚇 Official subway route", duration: "Estimated train journey", transfers: "Transfers", fare: "Card fare", distance: "Distance",
    ride: (s) => `${s.from} → ${s.to}: Take ${s.line}${s.direction ? ` toward ${s.direction}` : ""} (${s.segments} stops)`,
    transfer: (s) => `Transfer at ${s.station}: ${s.fromLine} → ${s.toLine}`,
    first: "First train departure", last: "Expected arrival", searched: "Checked at", note: "Waiting for the first train may not be included in the displayed journey duration. Operations and surcharges can change.",
    need: "Please specify the destination station, preferably in Korean (e.g. 안암역).", unsupported: "Official routing here currently supports departures from Jongno 5-ga Station only.",
    failed: "The official subway route could not be confirmed. Please check the exact station name.",
    via: "Routes with required intermediate stops aren't supported yet. Please enter only your destination.",
  },
  ja: {
    title: "🚇 公式地下鉄ルート", duration: "列車の推定所要時間", transfers: "乗換", fare: "交通カード運賃", distance: "距離",
    ride: (s) => `${s.from} → ${s.to}：${s.line}${s.direction ? `（${s.direction}方面）` : ""}に乗車（${s.segments}区間）`,
    transfer: (s) => `${s.station}駅で乗換：${s.fromLine} → ${s.toLine}`,
    first: "最初の列車の発車", last: "到着予定", searched: "照会時刻", note: "最初の列車の待ち時間は表示所要時間に含まれない場合があります。運行・追加運賃は変更される場合があります。",
    need: "目的地の駅名を入力してください。可能であれば韓国語の駅名（例：안암역）を入力してください。", unsupported: "現在の公式経路検索は鍾路5街駅発のみ対応しています。",
    failed: "公式経路を確認できませんでした。駅名を確認して再入力してください。",
    via: "経由駅を指定する検索にはまだ対応していません。目的地のみ入力してください。",
  },
  zh: {
    title: "🚇 官方地铁路线", duration: "预计乘车时间", transfers: "换乘", fare: "交通卡票价", distance: "距离",
    ride: (s) => `${s.from} → ${s.to}：乘坐${s.line}${s.direction ? `（${s.direction}方向）` : ""}（${s.segments}站）`,
    transfer: (s) => `在${s.station}站换乘：${s.fromLine} → ${s.toLine}`,
    first: "首班可乘列车出发", last: "预计抵达", searched: "查询时间", note: "首趟列车的等待时间可能不包含在所示乘车时长内。运营及附加票价可能变化。",
    need: "请输入目的地站名，建议使用韩文站名（例如：안암역）。", unsupported: "目前官方线路查询仅支持从钟路5街站出发。",
    failed: "无法确认官方地铁线路，请核对站名后重试。", via: "目前不支持指定途经站，请只输入目的地。",
  },
};

// Only exact names/aliases in this small map are translated. Unrecognized
// foreign destinations are NOT invented by Gemini or confused with other stations.
const FOREIGN_STATIONS = [
  [/\b(?:gangnam)\b|江南(?:站|駅)?|カンナム/i, "강남"],
  [/\b(?:anam)\b|安岩(?:站|駅)?|アナム/i, "안암"],
  [/\b(?:seoul station)\b|ソウル駅|首尔站|首爾站/i, "서울"],
  [/\b(?:jamsil)\b|蚕室(?:站|駅)?|잠실/i, "잠실"],
  [/\b(?:hongik university|hongik univ|hongdae)\b|弘大入口|ホンデ/i, "홍대입구"],
  [/\b(?:yeoncheon)\b|漣川|ヨンチョン/i, "연천"],
  [/\b(?:incheon)\b|仁川(?:站|駅)?|インチョン/i, "인천"],
  [/\b(?:dongdaemun history.*?park)\b|東大門歴史文化公園|东大门历史文化公园/i, "동대문역사문화공원"],
  [/\b(?:dongdaemun)\b|東大門(?:站|駅)?|东大门(?:站)?/i, "동대문"],
  [/\b(?:myeongdong)\b|明洞(?:站|駅)?|ミョンドン/i, "명동"],
  [/\b(?:yeouido)\b|汝矣島|汝矣岛|ヨイド/i, "여의도"],
  [/\b(?:jongno\s*5-?ga)\b|鍾路5街|钟路5街/i, ORIGIN],
];

export function isOfficialSubwayQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  // These are facility/service questions, not requests for a train itinerary.
  if (/(?:화장실|엘리베이터|승강기|에스컬레이터|게이트|개표|요금환불|교통카드충전|역무실|고객안전실|출구\s*\d+|첫차|막차|운행중단|분실물)/.test(q)) return false;
  if (/^[가-힣0-9·]{2,25}역$/.test(q) && !q.startsWith("종로5가역")) return true;
  const intent = /(?:길찾기|가는\s*법|가는법|가는\s*길|가려면|어떻게\s*(?:가|갈)|경로|최단\s*(?:시간|거리)|최소\s*환승|몇\s*(?:분|정거장)|얼마나\s*걸려|지하철(?:로|만|\s*타고)|전철(?:로|만|\s*타고)|역까지|역으로|(?:역|지하철).*?(?:갈\s*수|갈까|가나요|가야))/i;
  const foreignIntent = /(?:subway|metro|train|route|direction|how\s+(?:do\s+i\s+|to\s+)?(?:get|go)|take\s+me\s+to|地下鉄|行き方|乗換|地铁|地鐵|路线|路線|怎么去|怎麼去)/i;
  return intent.test(q) || foreignIntent.test(q);
}

function withStationSuffix(value) {
  const s = String(value || "");
  return s.endsWith("역") ? s : `${s}역`;
}

function stationName(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s/g, "").replace(/역$/, "");
}

export function parseRouteRequest(question) {
  const q = String(question || "").normalize("NFC").trim();
  const fromMatch = q.match(/([가-힣0-9·]{2,30}?)역?\s*(?:에서|부터)/);
  const explicitFrom = fromMatch ? stationName(fromMatch[1]) : null;
  const mentions = [...q.matchAll(/([가-힣0-9·]{2,30})역(?=(?:에서|부터|까지|으로|로|에는|을|를|은|는|이|가|행|\s|$|[?!,。]))/g)]
    .map((m) => stationName(m[1]))
    .filter((name) => name && !STATION_STOPWORDS.has(name));
  const nonOrigin = mentions.filter((name) => name !== ORIGIN);
  let destination = nonOrigin.length ? nonOrigin[nonOrigin.length - 1] : "";

  // Korean requests such as '종로5가에서 강남까지 어떻게 가?' (without 역 suffix).
  if (!destination) {
    const trailing = [...q.matchAll(/([가-힣0-9·]{2,30})\s*(?:까지|으로|로)(?!\s*부터)/g)]
      .map((m) => stationName(m[1]))
      .filter((name) => !STATION_STOPWORDS.has(name) && !AMBIGUOUS_DESTINATIONS.has(name) && name !== ORIGIN);
    destination = trailing.length ? trailing[trailing.length - 1] : "";
  }
  // English/Japanese/Chinese station aliases are selected by their position
  // in the question, not the ordering of the dictionary above.
  const foreignHits = FOREIGN_STATIONS.flatMap(([matcher, name]) => {
    const globalMatcher = new RegExp(matcher.source, matcher.flags.includes("g") ? matcher.flags : `${matcher.flags}g`);
    return [...q.matchAll(globalMatcher)].map((m) => ({ name, start: m.index, end: m.index + m[0].length }));
  }).sort((a, b) => a.start - b.start);
  const fromMarkers = [...q.matchAll(/\bfrom\b|从|從|から/gi)];
  const toMarkers = [...q.matchAll(/\bto\b|到|去|まで|へ/gi)];
  const foreignFrom = fromMarkers.map((m) => foreignHits.find((x) => x.start >= m.index + m[0].length))
    .find(Boolean)?.name || null;
  const foreignTo = toMarkers.map((m) => foreignHits.find((x) => x.start >= m.index + m[0].length))
    .filter(Boolean).at(-1)?.name || null;
  if (!destination && foreignHits.length) {
    destination = foreignTo || foreignHits[foreignHits.length - 1].name;
  }
  const mode = /(?:최소\s*환승|환승\s*(?:적|최소)|fewest\s+transfers|少换乘|少換乘|乗換.*少)/i.test(q)
    ? "transfer"
    : /(?:최단\s*거리|가장\s*짧은\s*거리|shortest\s+distance|最短距离|最短距離)/i.test(q)
      ? "distance" : "duration";
  return { destination, mode, unsupportedOrigin: (!!explicitFrom && explicitFrom !== ORIGIN) || (!!foreignFrom && foreignFrom !== ORIGIN),
    viaRequested: /(?:경유|거쳐|들렀다가|via\s+|経由|途经|途經)/i.test(q) };
}

function duration(seconds, lang) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (lang === "en") return `${h ? `${h}h ` : ""}${m}m${s ? ` ${s}s` : ""}`;
  if (lang === "ja") return `${h ? `${h}時間` : ""}${m}分${s ? `${s}秒` : ""}`;
  if (lang === "zh") return `${h ? `${h}小时` : ""}${m}分${s ? `${s}秒` : ""}`;
  return `${h ? `${h}시간 ` : ""}${m}분${s ? ` ${s}초` : ""}`;
}

function officialAnswer(route, lang) {
  const t = LANG_TEXT[lang] || LANG_TEXT.ko;
  const rides = (route.itinerary || []).filter((s) => s.type === "ride");
  const first = rides[0];
  const last = rides[rides.length - 1];
  const lines = [
    t.title,
    `${withStationSuffix(route.origin)} → ${withStationSuffix(route.destination)}`,
    `${t.duration}: ${duration(route.totalSeconds, lang)} · ${t.transfers}: ${route.transferCount}` +
      `${route.fareWon ? ` · ${t.fare}: ${Number(route.fareWon).toLocaleString("ko-KR")}원` : ""}`,
    "",
    ...(route.itinerary || []).map((step, i) => `${i + 1}. ${step.type === "transfer" ? t.transfer(step) : t.ride(step)}`),
    "",
    ...(first?.departureTime ? [`${t.first}: ${first.departureTime}`] : []),
    ...(last?.arrivalTime ? [`${t.last}: ${last.arrivalTime}`] : []),
    `${t.searched}: ${route.searchedAt} (KST)`,
    t.note,
  ];
  return lines.join("\n");
}

function responseText(lang, key) {
  const t = LANG_TEXT[lang] || LANG_TEXT.ko;
  return { ok: true, answer: t[key], sources: [], googleSearchQueries: [], groundingSupports: [], searchSuggestion: null, routeSource: "official-seoul-metro" };
}

export async function officialSubwayResponse(question, lang = "ko") {
  const t = Object.prototype.hasOwnProperty.call(LANG_TEXT, lang) ? lang : "ko";
  const parsed = parseRouteRequest(question);
  if (parsed.unsupportedOrigin) return responseText(t, "unsupported");
  if (parsed.viaRequested) return responseText(t, "via");
  if (!parsed.destination) return responseText(t, "need");
  if (parsed.destination === ORIGIN) return responseText(t, "need");

  // Route-test API verifies the returned station names before exposing results.
  // '서울' and '서울역' are alternative representations on some data sources.
  const destinations = parsed.destination === "서울" ? ["서울", "서울역"] : [parsed.destination];
  for (const destination of destinations) {
    try {
      const args = new URLSearchParams({ to: destination, mode: parsed.mode });
      const officialRequest = new Request(`https://internal.local/api/subway-route?${args.toString()}`);
      const result = await getOfficialSubwayRoute(officialRequest);
      const data = await result.json();
      if (result.ok && data?.ok && data.route) {
        return {
          ok: true,
          answer: officialAnswer(data.route, t),
          sources: [], googleSearchQueries: [], groundingSupports: [], searchSuggestion: null,
          routeSource: "official-seoul-metro", route: data.route,
        };
      }
      // Do not retry invalid keys/server faults or other known API outages.
      if (data?.code !== "METRO_10" && data?.code !== "PARSE_ROUTE") break;
    } catch {
      break;
    }
  }
  // Never fall back to hallucinated interchange or timings from Gemini.
  return responseText(t, "failed");
}
