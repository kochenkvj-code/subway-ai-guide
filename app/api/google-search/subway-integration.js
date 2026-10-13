// v6.9: Multilingual intent, complete route-result localization and optional
// narrow Gemini station-name normalization (never AI-generated itineraries).
// Seoul Metro shortest-path API remains the sole source of routing facts.
import { GET as getOfficialSubwayRoute } from "../subway-route/route.js";

const ORIGIN = "종로5가";

// Common Seoul-area station names and foreign display labels.
// The Korean name is the sole value passed to the official routing API.
const KNOWN_STATIONS = [
  ["종로5가", "Jongno 5-ga", "チョンノオガ", "钟路五街"],
  ["안암", "Anam", "アナム", "安岩"],
  ["강남", "Gangnam", "カンナム", "江南"],
  ["서울", "Seoul Station", "ソウル", "首尔"],
  ["인천", "Incheon", "インチョン", "仁川"],
  ["연천", "Yeoncheon", "ヨンチョン", "涟川"],
  ["잠실", "Jamsil", "チャムシル", "蚕室"],
  ["홍대입구", "Hongik University", "ホンデイック", "弘大入口"],
  ["동대문", "Dongdaemun", "トンデムン", "东大门"],
  ["동대문역사문화공원", "Dongdaemun History & Culture Park", "トンデムンヨクサムンファゴンウォン", "东大门历史文化公园"],
  ["명동", "Myeong-dong", "ミョンドン", "明洞"],
  ["여의도", "Yeouido", "ヨイド", "汝矣岛"],
  ["동묘앞", "Dongmyo", "トンミョアプ", "东庙"],
  ["봉화산", "Bonghwasan", "ポンファサン", "烽火山"],
  ["신내", "Sinnae", "シンネ", "新内"],
  ["종각", "Jonggak", "チョンガク", "钟阁"],
  ["시청", "City Hall", "シチョン", "市厅"],
  ["종로3가", "Jongno 3-ga", "チョンノサムガ", "钟路三街"],
  ["청량리", "Cheongnyangni", "チョンニャンニ", "清凉里"],
  ["용산", "Yongsan", "ヨンサン", "龙山"],
  ["수원", "Suwon", "スウォン", "水原"],
  ["왕십리", "Wangsimni", "ワンシムニ", "往十里"],
  ["합정", "Hapjeong", "ハプチョン", "合井"],
  ["신촌", "Sinchon", "シンチョン", "新村"],
  ["이대", "Ewha Womans University", "イデ", "梨花女子大学"],
  ["신도림", "Sindorim", "シンドリム", "新道林"],
  ["고속터미널", "Express Bus Terminal", "コソクトミノル", "高速巴士客运站"],
  ["교대", "Seoul National University of Education", "キョデ", "教大"],
  ["사당", "Sadang", "サダン", "舍堂"],
  ["삼성", "Samseong", "サムソン", "三成"],
  ["선릉", "Seolleung", "ソルルン", "宣陵"],
  ["역삼", "Yeoksam", "ヨクサム", "驿三"],
  ["건대입구", "Konkuk University", "コンデイック", "建大入口"],
  ["성수", "Seongsu", "ソンス", "圣水"],
  ["을지로입구", "Euljiro 1-ga", "ウルチロイック", "乙支路入口"],
  ["을지로3가", "Euljiro 3-ga", "ウルチロサムガ", "乙支路三街"],
  ["충정로", "Chungjeongno", "チュンジョンノ", "忠正路"],
  ["혜화", "Hyehwa", "ヘファ", "惠化"],
  ["광화문", "Gwanghwamun", "クァンファムン", "光化门"],
  ["경복궁", "Gyeongbokgung", "キョンボックン", "景福宫"],
  ["독립문", "Dongnimmun", "トンニンムン", "独立门"],
  ["안국", "Anguk", "アングク", "安国"],
  ["이태원", "Itaewon", "イテウォン", "梨泰院"],
  ["공덕", "Gongdeok", "コンドク", "孔德"],
  ["김포공항", "Gimpo International Airport", "キンポ空港", "金浦机场"],
  ["인천공항1터미널", "Incheon Airport Terminal 1", "仁川空港第1ターミナル", "仁川机场1号航站楼"],
  ["인천공항2터미널", "Incheon Airport Terminal 2", "仁川空港第2ターミナル", "仁川机场2号航站楼"],
  ["서울대입구", "Seoul National University", "ソウル大入口", "首尔大入口"],
  ["신림", "Sillim", "シンリム", "新林"],
  ["노량진", "Noryangjin", "ノリャンジン", "鹭梁津"],
  ["여의나루", "Yeouinaru", "ヨイナル", "汝矣渡口"],
  ["마포", "Mapo", "マポ", "麻浦"],
  ["동대문역사문화공원", "Dongdaemun History and Culture Park", "東大門歴史文化公園", "东大门历史文化公园"],
  ["홍대입구", "Hongik Univ.", "弘大入口", "弘益大学入口"],
  ["서울", "Seoul", "ソウル駅", "首尔站"],
  ["안암", "Anam Station", "安岩駅", "安岩站"],
  ["강남", "Gangnam Station", "江南駅", "江南站"],
  ["종로5가", "Jongno 5(o)-ga", "鍾路5街", "钟路5街"],
  ["종로5가", "Jongno 5-ga Station", "鍾路五街", "钟路五街"],
  ["잠실", "Jamsil Station", "蚕室駅", "蚕室站"],
  ["명동", "Myeongdong", "明洞駅", "明洞站"],
  ["연천", "Yeoncheon Station", "漣川", "涟川站"],
  ["연천", "Yoncheon", "ヨンチョン駅", "漣川"],
  ["홍대입구", "Hongdae", "ホンデ", "弘大入口站"],
  ["홍대입구", "Hongik Univ", "ホンデイック駅", "弘大入口"],
  ["동대문", "Dongdaemun Station", "東大門", "东大门站"],
  ["여의도", "Yeouido Station", "汝矣島", "汝矣岛站"],
  ["시청", "Seoul City Hall", "市庁", "市厅站"],
  ["김포공항", "Gimpo Airport", "金浦空港", "金浦机场站"],
  ["을지로입구", "Euljiro 1(il)-ga", "乙支路入口", "乙支路入口站"],
];

function canonicalName(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, "").replace(/역$/, "");
}
function aliasKey(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase("en")
    .replace(/(?:\s*(?:station|sta\.|駅|站))$/i, "")
    .replace(/[\s.·•\-_'’()（）&]+/g, "");
}
const foreignAliases = new Map();
const preferredNames = new Map();
for (const row of KNOWN_STATIONS) {
  const [ko, en, ja, zh] = row;
  if (!preferredNames.has(ko)) preferredNames.set(ko, { ko, en, ja, zh });
  for (const value of [ko, en, ja, zh]) {
    foreignAliases.set(aliasKey(value), ko);
  }
}
// Important short aliases and simplified/traditional Chinese variants.
const EXTRA_ALIASES = {
  "an-am": "안암", "dongdaemun history culture park": "동대문역사문화공원",
  "dongdaemun history and culture park": "동대문역사문화공원", "hongik university station": "홍대입구",
  "hongik univ station": "홍대입구", "city hall station": "시청", "seoul station": "서울",
  "仁川": "인천", "インチョン": "인천", "首爾": "서울", "首爾站": "서울",
  "鍾路5街": ORIGIN, "鍾路五街": ORIGIN, "钟路五街": ORIGIN,
  "安岩": "안암", "アナム": "안암", "カンナム": "강남", "江南": "강남",
  "漣川": "연천", "涟川": "연천", "東大門": "동대문", "東大門歴史文化公園": "동대문역사문화공원",
  "鐘路5街": ORIGIN, "鐘路五街": ORIGIN,
};
for (const [alias, ko] of Object.entries(EXTRA_ALIASES)) foreignAliases.set(aliasKey(alias), ko);

const NAME_ALIASES = [...foreignAliases.entries()]
  .filter(([key]) => key.length >= 2)
  .sort((a, b) => b[0].length - a[0].length);

// Identify names without translating arbitrary prose. Verify longer names before shorter ones.
function knownStationMentions(question) {
  const q = String(question || "");
  const normalized = q.normalize("NFKC").toLocaleLowerCase("en");
  const compact = aliasKey(normalized);
  const originalToCompact = [];
  // Index positions in normalized compact string. Avoid substring aliases inside
  // English words by requiring word boundaries in raw English names below.
  let pos = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (/[\s.·•\-_'’()（）&]/.test(normalized[i])) continue;
    originalToCompact.push(i); pos++;
  }
  const hits = [];
  const occupied = [];
  for (const [key, ko] of NAME_ALIASES) {
    let offset = 0;
    while (offset < compact.length) {
      const at = compact.indexOf(key, offset);
      if (at < 0) break;
      const end = at + key.length;
      offset = at + 1;
      const origStart = originalToCompact[at] ?? 0;
      const origEnd = (originalToCompact[end - 1] ?? origStart) + 1;
      // Prevent 'seoul' matching as substring of longer English station names
      // or random English words. Korean/Chinese/Japanese are allowed adjacent suffixes.
      if (/^[a-z]/.test(key) && origStart > 0 && /[a-z]/i.test(normalized[origStart - 1])) continue;
      if (/[a-z]$/.test(key) && /[a-z]/i.test(normalized[origEnd] || "")) continue;
      // In "강남구청역", don't silently read the unrelated "강남" station.
      // Allow ordinary suffix particles in "강남에서" and "강남역".
      const next = normalized.slice(origEnd);
      if (/[가-힣]$/.test(key) && /[가-힣]/.test(normalized[origEnd] || "") &&
        !/^(?:역|에서|부터|까지|으로|로|에|를|은|는|이|가|을|도|행|쪽)(?:[^가-힣]|$|[가-힣])/.test(next)) continue;
      if (occupied.some(([s, e]) => origStart < e && origEnd > s)) continue;
      occupied.push([origStart, origEnd]);
      hits.push({ ko, start: origStart, end: origEnd });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

const STRINGS = {
  ko: {
    title: "🚇 공식 지하철 경로 안내", duration: "예상 열차 여정", transfers: "환승", fare: "교통카드 요금", distance: "이동 거리",
    first: "첫 열차 출발", last: "도착 예정", searched: "조회 기준", note: "첫 열차 탑승까지 대기시간은 열차 여정과 별도일 수 있습니다. 운행상황과 추가운임은 달라질 수 있습니다.",
    need: "도착역 이름을 알려주세요. 예: ‘안암역 가는 법’", unsupported: "현재 공식 경로조회는 종로5가역 출발만 지원합니다.",
    failed: "공식 경로를 확인하지 못했습니다. 목적지 역명을 확인한 뒤 다시 입력해 주세요.", via: "현재 경유역 지정은 지원하지 않습니다. 도착역만 입력해 주세요.",
  },
  en: {
    title: "🚇 Official subway directions", duration: "Train journey", transfers: "Transfers", fare: "Card fare", distance: "Distance",
    first: "First train departure", last: "Estimated arrival", searched: "Checked at", note: "Waiting for the first train may not be included in the journey time. Service and surcharges can change.",
    need: "Please tell me your destination station (e.g. Anam Station).", unsupported: "Official routes currently start at Jongno 5-ga Station only.",
    failed: "The official route could not be confirmed. Please double-check the destination station name.", via: "A required intermediate stop isn't supported yet. Please enter just your destination.",
  },
  ja: {
    title: "🚇 公式地下鉄ルート案内", duration: "列車の所要時間", transfers: "乗換", fare: "交通カード運賃", distance: "距離",
    first: "最初の列車の発車", last: "到着予定", searched: "照会時刻", note: "最初の列車の待ち時間は表示所要時間に含まれない場合があります。運行・追加運賃は変更される場合があります。",
    need: "目的地の駅名を教えてください（例：安岩駅）。", unsupported: "現在は鍾路5街駅からの経路検索のみ対応しています。",
    failed: "公式経路を確認できませんでした。目的駅名を確認して再度お試しください。", via: "経由駅を指定する経路検索にはまだ対応していません。目的地だけ入力してください。",
  },
  zh: {
    title: "🚇 官方地铁路线", duration: "乘车时间", transfers: "换乘", fare: "交通卡票价", distance: "距离",
    first: "首趟列车出发", last: "预计抵达", searched: "查询时间", note: "等候首趟列车的时间可能未计入乘车时间。实际运营及附加票价可能变化。",
    need: "请输入目的地车站名称（例如：安岩站）。", unsupported: "目前官方线路查询仅支持从钟路5街站出发。",
    failed: "无法确认官方地铁路线，请核对目的地站名后重试。", via: "目前不支持指定途经站，请仅输入目的地。",
  },
};

// Display labels are NOT used for route lookup; only Korean names go to the API.
// Prefer established station/line translations to avoid unnecessarily invoking AI.
const DISPLAY_OVERRIDES = {
  "종로5가": { en: "Jongno 5-ga", ja: "鍾路5街", zh: "钟路5街" },
  "강남": { en: "Gangnam", ja: "江南", zh: "江南" },
  "안암": { en: "Anam", ja: "安岩", zh: "安岩" },
  "신창": { en: "Sinchang", ja: "新昌", zh: "新昌" },
  "오금": { en: "Ogeum", ja: "梧琴", zh: "梧琴" },
  "광교": { en: "Gwanggyo", ja: "光教", zh: "光教" },
  "신사": { en: "Sinsa", ja: "新沙", zh: "新沙" },
  "양재": { en: "Yangjae", ja: "良才", zh: "良才" },
  "남부터미널": { en: "Nambu Bus Terminal", ja: "南部ターミナル", zh: "南部客运站" },
  "고속터미널": { en: "Express Bus Terminal", ja: "高速ターミナル", zh: "高速巴士客运站" },
  "교대": { en: "Seoul Nat'l Univ. of Education", ja: "教大", zh: "教大" },
  "종로3가": { en: "Jongno 3-ga", ja: "鍾路3街", zh: "钟路3街" },
  "동묘앞": { en: "Dongmyo", ja: "東廟前", zh: "东庙前" },
  "종각": { en: "Jonggak", ja: "鐘閣", zh: "钟阁" },
  "서울": { en: "Seoul", ja: "ソウル", zh: "首尔" },
  "청량리": { en: "Cheongnyangni", ja: "清凉里", zh: "清凉里" },
  "봉화산": { en: "Bonghwasan", ja: "烽火山", zh: "烽火山" },
  "인천": { en: "Incheon", ja: "仁川", zh: "仁川" },
  "연천": { en: "Yeoncheon", ja: "漣川", zh: "涟川" },
  "잠실": { en: "Jamsil", ja: "蚕室", zh: "蚕室" },
  "시청": { en: "City Hall", ja: "市庁", zh: "市厅" },
  "역삼": { en: "Yeoksam", ja: "駅三", zh: "驿三" },
  "선릉": { en: "Seolleung", ja: "宣陵", zh: "宣陵" },
};

const LINE_LABELS = {
  "신분당선": { en: "Shinbundang Line", ja: "新盆唐線", zh: "新盆唐线" },
  "분당선": { en: "Bundang Line", ja: "盆唐線", zh: "盆唐线" },
  "수인분당선": { en: "Suin–Bundang Line", ja: "水仁・盆唐線", zh: "水仁盆唐线" },
  "경의중앙선": { en: "Gyeongui–Jungang Line", ja: "京義・中央線", zh: "京义中央线" },
  "경의·중앙선": { en: "Gyeongui–Jungang Line", ja: "京義・中央線", zh: "京义中央线" },
  "경춘선": { en: "Gyeongchun Line", ja: "京春線", zh: "京春线" },
  "경강선": { en: "Gyeonggang Line", ja: "京江線", zh: "京江线" },
  "서해선": { en: "Seohae Line", ja: "西海線", zh: "西海线" },
  "신림선": { en: "Sillim Line", ja: "新林線", zh: "新林线" },
  "우이신설선": { en: "Ui–Sinseol Line", ja: "牛耳新設線", zh: "牛耳新设线" },
  "공항철도": { en: "AREX Airport Railroad", ja: "空港鉄道", zh: "机场铁路" },
  "인천1호선": { en: "Incheon Line 1", ja: "仁川1号線", zh: "仁川1号线" },
  "인천2호선": { en: "Incheon Line 2", ja: "仁川2号線", zh: "仁川2号线" },
  "김포골드라인": { en: "Gimpo Goldline", ja: "金浦ゴールドライン", zh: "金浦金线" },
  "용인경전철": { en: "Yongin EverLine", ja: "龍仁軽電鉄", zh: "龙仁轻轨" },
  "의정부경전철": { en: "Uijeongbu LRT", ja: "議政府軽電鉄", zh: "议政府轻轨" },
  "GTX-A": { en: "GTX-A", ja: "GTX-A", zh: "GTX-A" },
};

// If the dynamic translator is unavailable, romanize rather than showing raw
// Hangul inside Japanese/Chinese/English directions. This is NOT an assertion
// that the romanization is the station's official international name.
const INITIAL = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const MEDIAL = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const FINAL = ["","k","k","ks","n","nj","nh","t","l","lk","lm","lb","ls","lt","lp","lh","m","p","ps","t","t","ng","t","t","k","t","p","t"];
function romanizeKorean(str) {
  const transliterated = [...String(str || "")].map((c) => {
    const offset = c.charCodeAt(0) - 0xAC00;
    if (offset < 0 || offset >= 11172) return c;
    const a = Math.floor(offset / 588), b = Math.floor((offset % 588) / 28), d = offset % 28;
    return INITIAL[a] + MEDIAL[b] + FINAL[d];
  }).join("");
  return transliterated.replace(/\p{Script=Hangul}/gu, "").replace(/(^|[\s-])[a-z]/g, (m) => m.toUpperCase());
}
function safeLocalizedLabel(value) {
  return typeof value === "string" && value.length <= 100 && value.trim() &&
    !/[가-힣\r\n\u0000-\u001f]/.test(value) ? value.trim() : null;
}
function knownStationLabel(ko, lang) {
  return safeLocalizedLabel(DISPLAY_OVERRIDES[ko]?.[lang]) ||
    safeLocalizedLabel(preferredNames.get(ko)?.[lang]);
}
function suffixName(name, lang, labels = {}) {
  const ko = canonicalName(name);
  if (lang === "ko") return `${ko}역`;
  const display = knownStationLabel(ko, lang) || safeLocalizedLabel(labels[ko]) || romanizeKorean(ko);
  if (lang === "en") return /\b(?:station|terminal\s*\d+)$/i.test(display) ? display : `${display} Station`;
  if (lang === "ja") return display.endsWith("駅") ? display : `${display}駅`;
  if (lang === "zh") return display.endsWith("站") ? display : `${display}站`;
  return `${ko}역`;
}
function knownLineLabel(name, lang) {
  const raw = String(name || "").trim();
  const match = raw.match(/^(\d+)호선$/);
  if (match) return lang === "en" ? `Line ${match[1]}` : lang === "ja" ? `${match[1]}号線` : lang === "zh" ? `${match[1]}号线` : raw;
  return safeLocalizedLabel(LINE_LABELS[raw]?.[lang]);
}
function lineLabel(name, lang, labels = {}) {
  const raw = String(name || "").trim();
  if (lang === "ko") return raw;
  const translated = knownLineLabel(raw, lang) || safeLocalizedLabel(labels[raw]);
  if (translated) return translated;
  const latin = romanizeKorean(raw.replace(/선$/, "")).trim();
  return lang === "en" ? `${latin} Line` : lang === "ja" ? `${latin}線` : `${latin}线`;
}
function untranslatedRouteLabels(route, lang) {
  if (lang === "ko") return [];
  const missing = new Set();
  const station = (value) => {
    if (value && !knownStationLabel(canonicalName(value), lang)) missing.add(canonicalName(value));
  };
  const line = (value) => {
    const name = String(value || "").trim();
    if (name && !knownLineLabel(name, lang)) missing.add(name);
  };
  station(route.origin); station(route.destination);
  for (const step of route.itinerary || []) {
    if (step.type === "transfer") {
      station(step.station); line(step.fromLine); line(step.toLine);
    } else if (step.type === "ride") {
      station(step.from); station(step.to); station(step.direction); line(step.line);
    }
  }
  return [...missing].slice(0, 50);
}
function tripTime(seconds, lang) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
  if (lang === "en") return `${h ? `${h}h ` : ""}${m}m${r ? ` ${r}s` : ""}`;
  if (lang === "ja") return `${h ? `${h}時間` : ""}${m}分${r ? `${r}秒` : ""}`;
  if (lang === "zh") return `${h ? `${h}小时` : ""}${m}分${r ? `${r}秒` : ""}`;
  return `${h ? `${h}시간 ` : ""}${m}분${r ? ` ${r}초` : ""}`;
}
function stepText(step, lang, labels = {}) {
  if (step.type === "transfer") {
    const station = suffixName(step.station, lang, labels);
    const lines = `${lineLabel(step.fromLine, lang, labels)} → ${lineLabel(step.toLine, lang, labels)}`;
    return lang === "en" ? `Transfer at ${station}: ${lines}` : lang === "ja" ? `${station}で乗換：${lines}` : lang === "zh" ? `在${station}换乘：${lines}` : `${station}에서 환승: ${lines}`;
  }
  const segment = `${suffixName(step.from, lang, labels)} → ${suffixName(step.to, lang, labels)}`;
  const line = lineLabel(step.line, lang, labels), dir = step.direction ? suffixName(step.direction, lang, labels) : "";
  if (lang === "en") return `${segment}: Take ${line}${dir ? ` toward ${dir}` : ""} (${step.segments} stops)`;
  if (lang === "ja") return `${segment}：${line}${dir ? `（${dir}方面）` : ""}に乗車（${step.segments}駅）`;
  if (lang === "zh") return `${segment}：乘坐${line}${dir ? `（开往${dir}方向）` : ""}（${step.segments}站）`;
  return `${segment}: ${line}${dir ? ` ${dir} 방면` : ""} 탑승 (${step.segments}구간)`;
}
function formatAnswer(route, lang, labels = {}) {
  const t = STRINGS[lang];
  const rides = (route.itinerary || []).filter((s) => s.type === "ride");
  const first = rides[0], last = rides.at(-1);
  const unit = lang === "en" ? "KRW" : lang === "ja" ? "ウォン" : lang === "zh" ? "韩元" : "원";
  return [
    t.title,
    `${suffixName(route.origin, lang, labels)} → ${suffixName(route.destination, lang, labels)}`,
    `${t.duration}: ${tripTime(route.totalSeconds, lang)} · ${t.transfers}: ${route.transferCount}` +
      (route.fareWon ? ` · ${t.fare}: ${Number(route.fareWon).toLocaleString("ko-KR")}${lang === "ko" ? "원" : ` ${unit}`}` : "") +
      (route.totalMeters ? ` · ${t.distance}: ${(route.totalMeters / 1000).toFixed(1)} km` : ""),
    "", ...(route.itinerary || []).map((step, i) => `${i + 1}. ${stepText(step, lang, labels)}`), "",
    ...(first?.departureTime ? [`${t.first}: ${first.departureTime}`] : []),
    ...(last?.arrivalTime ? [`${t.last}: ${last.arrivalTime}`] : []),
    `${t.searched}: ${route.searchedAt} (KST)`, t.note,
  ].join("\n");
}

const routeWords = /(?:길찾기|가는\s*(?:법|길)|가려면|어떻게\s*(?:가|갈)|경로|최단|최소\s*환승|몇\s*(?:분|정거장)|얼마나\s*걸려|지하철(?:로|만|\s*타고)|전철(?:로|만|\s*타고)|역까지|역으로|\b(?:subway|metro|train|route|directions?|transfers?|travel|ride|reach|go|going|get\s+to|take\s+me\s+to|how\s+(?:do|can|could|would|to))\b|地下鉄|電車|行き方|どうやって|行きたい|行く|行けます|行けば|乗換|乗り換え|ルート|経路|まで|地铁|地鐵|路线|路線|怎么去|怎麼去|怎么走|怎麼走|如何去|如何到|我要去|我想去|前往|乘车|乘車|换乘|換乘)/i;
const nonRoutes = /(?:화장실|엘리베이터|승강기|에스컬레이터|게이트|개표|교통카드충전|역무실|고객안전실|분실물|첫차|막차|운행중단|\b(?:toilet|restroom|bathroom|elevator|exit|entrance|ticket|lost\s+and\s+found|last\s+train|first\s+train|gate\s+error)\b|トイレ|エレベーター|出口|終電|始発|卫生间|廁所|厕所|洗手间|电梯|電梯|出口)/i;
export function isOfficialSubwayQuestion(question) {
  const q = String(question || "").trim();
  if (!q || nonRoutes.test(q)) return false;
  // Explicit station-only searches including Latin/Japanese/Chinese.
  if (/^[가-힣0-9·]{2,25}역$/.test(q) && !q.startsWith("종로5가역")) return true;
  if (routeWords.test(q)) return true;
  // Japanese "X駅からY駅へ" and Chinese "从X到Y" omit route keywords.
  if (knownStationMentions(q).length >= 2 && /(?:から|へ|從|从|到|至|\bfrom\b|\bto\b)/i.test(q)) return true;
  return knownStationMentions(q).some((m) => m.ko !== ORIGIN) && /(?:station|駅|站)$/i.test(q);
}

export function parseRouteRequest(question) {
  const q = String(question || "").normalize("NFKC").trim();
  const hits = knownStationMentions(q);
  // Prioritize explicit grammar, not longest or last substring in all cases.
  const fromMarker = /\bfrom\b|从|從/gim;
  const fromMarks = [...q.matchAll(fromMarker)];
  const koFrom = [...q.matchAll(/([가-힣0-9·]{2,30})역?\s*(?:에서|부터)/g)]
    .map((m) => ({ ko: canonicalName(m[1]), start: m.index }));
  const jpFrom = [...q.matchAll(/から/g)].map((m) => hits.filter((h) => h.end <= m.index).at(-1)).find(Boolean)?.ko || null;
  const from = fromMarks.map((m) => {
    const start = m.index + m[0].length;
    const nextTo = q.slice(start).search(/\bto\b|到|至/i);
    const limit = nextTo < 0 ? start + 55 : start + nextTo;
    return hits.find((h) => h.start >= start && h.start < limit);
  }).find(Boolean)?.ko || jpFrom || koFrom[0]?.ko || null;
  const toMarks = [...q.matchAll(/\bto\b|到|至|まで|へ/gim)];
  const toHit = toMarks.map((m) => hits.find((h) => h.start >= m.index + m[0].length && h.start < m.index + m[0].length + 70))
    .filter(Boolean).at(-1);
  const koTo = [...q.matchAll(/([가-힣0-9·]{2,30})역?\s*(?:까지|으로|로)(?!\s*부터)/g)]
    .map((m) => canonicalName(m[1])).find((x) => x && x !== ORIGIN);
  const withoutOrigin = hits.filter((h) => h.ko !== ORIGIN && h.ko !== from);
  const destination = toHit?.ko && toHit.ko !== from ? toHit.ko : withoutOrigin.at(-1)?.ko || koTo || "";
  // Treat arbitrary station-name fragments from Korean as unknown rather than
  // sending that guessed phrase to the official API.
  const mode = /(?:최소\s*환승|환승\s*(?:적|최소)|fewest\s+transfers|少换乘|少換乘|乗換.*少)/i.test(q) ? "transfer" :
    /(?:최단\s*거리|가장\s*짧은\s*거리|shortest\s+distance|最短距离|最短距離)/i.test(q) ? "distance" : "duration";
  const unsupportedOrigin = !!from && from !== ORIGIN;
  const viaRequested = /(?:경유|거쳐|들렀다가|\bvia\b|経由|途经|途經)/i.test(q);
  const originWasSpecified = /\bfrom\b|从|從|から|[가-힣0-9·]{2,30}역?\s*(?:에서|부터)/i.test(q);
  return { destination, mode, unsupportedOrigin, viaRequested, origin: from,
    unresolvedOrigin: originWasSpecified && !from, knownHits: hits };
}

function localizedResponse(lang, key) {
  return { ok: true, answer: STRINGS[lang][key], sources: [], googleSearchQueries: [], groundingSupports: [], searchSuggestion: null, routeSource: "official-seoul-metro" };
}

// Resolve only STATION NAMES, not directions/times. Return null on uncertainty.
// The caller injects a resolver that uses the existing Google OIDC credentials.
export async function officialSubwayResponse(question, lang = "ko", resolveUnknown, translateLabels) {
  const language = STRINGS[lang] ? lang : "ko";
  let parsed = parseRouteRequest(question);
  if (parsed.viaRequested) return localizedResponse(language, "via");
  if (parsed.unsupportedOrigin) return localizedResponse(language, "unsupported");
  // Unknown foreign stations can be normalized from all three foreign languages.
  if ((!parsed.destination || parsed.unresolvedOrigin) && resolveUnknown) {
    try {
      const identified = await resolveUnknown(question);
      if (identified && identified.confident === true) {
        const translatedOrigin = identified.origin ? canonicalName(identified.origin) : null;
        parsed = { ...parsed, origin: translatedOrigin || parsed.origin,
          unsupportedOrigin: parsed.unsupportedOrigin || (!!translatedOrigin && translatedOrigin !== ORIGIN),
          unresolvedOrigin: parsed.unresolvedOrigin && !translatedOrigin,
          destination: canonicalName(identified.destination) };
      }
    } catch { /* Fail closed; no fabricated itineraries. */ }
  }
  if (parsed.unsupportedOrigin || parsed.unresolvedOrigin) return localizedResponse(language, "unsupported");
  if (!parsed.destination || parsed.destination === ORIGIN) return localizedResponse(language, "need");
  const destinations = parsed.destination === "서울" ? ["서울", "서울역"] : [parsed.destination];
  for (const destination of destinations) {
    try {
      const args = new URLSearchParams({ to: destination, mode: parsed.mode });
      const officialRequest = new Request(`https://internal.local/api/subway-route?${args.toString()}`);
      const result = await getOfficialSubwayRoute(officialRequest);
      const data = await result.json();
      if (result.ok && data?.ok && data.route) {
        let localizedLabels = {};
        const missing = untranslatedRouteLabels(data.route, language);
        if (missing.length && translateLabels) {
          try { localizedLabels = (await translateLabels(missing, language)) || {}; }
          catch { /* The official routing result must still be delivered. */ }
        }
        return {
          ok: true, answer: formatAnswer(data.route, language, localizedLabels), sources: [],
          googleSearchQueries: [], groundingSupports: [], searchSuggestion: null,
          routeSource: "official-seoul-metro", route: data.route,
        };
      }
      if (data?.code !== "METRO_10" && data?.code !== "PARSE_ROUTE") break;
    } catch { break; }
  }
  return localizedResponse(language, "failed");
}
