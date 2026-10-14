import officialStations from "../../data/seoulMetroOfficialStations.json";
// Seoul Metro shortest-route API: independent of app/api/google-search/route.js.
// Only the server reads SEOUL_METRO_API_KEY. The key is never returned to clients.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "https://apis.data.go.kr/B553766/path2/getShtrmPath2";
const ORIGIN = "종로5가";
const MODES = new Set(["duration", "distance", "transfer"]);
const BY_CODE = new Map(officialStations.map((s) => [s.code, s]));

function seoulTimestamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const field = (type) => parts.find((x) => x.type === type)?.value ?? "";
  return `${field("year")}-${field("month")}-${field("day")} ${field("hour")}:${field("minute")}:${field("second")}`;
}

function errorResponse(message, status, code) {
  return Response.json({ ok: false, error: message, code }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

function cleanStationName(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function summarizeRoute(body, destination, searchedAt) {
  const raw = Array.isArray(body.paths) ? body.paths : [];
  if (raw.length === 0) throw new Error("경로 데이터가 비어 있습니다.");
  const first = raw[0];
  const last = raw[raw.length - 1];
  // Do not display routes to similarly named stations (강남구청 instead of 강남).
  const actualOrigin = cleanStationName(first?.dptreStn?.stnNm);
  const actualDestination = cleanStationName(last?.arvlStn?.stnNm);
  if (actualOrigin !== ORIGIN || actualDestination !== destination) {
    throw new Error(`정확한 역명에 해당하는 경로를 찾지 못했습니다. (${actualOrigin} → ${actualDestination})`);
  }

  const itinerary = [];
  let ride = null;
  const allStations = [actualOrigin];

  const flush = () => {
    if (ride) itinerary.push(ride);
    ride = null;
  };

  for (const step of raw) {
    const from = cleanStationName(step?.dptreStn?.stnNm);
    const to = cleanStationName(step?.arvlStn?.stnNm);
    const line = cleanStationName(step?.dptreStn?.lineNm);
    const nextLine = cleanStationName(step?.arvlStn?.lineNm);
    if (!from || !to || !line || !nextLine) throw new Error("경로에 필요한 역명이나 노선 정보가 없습니다.");

    if (step.trsitYn === "Y" || (from === to && line !== nextLine)) {
      flush();
      itinerary.push({
        type: "transfer", station: from, fromLine: line, toLine: nextLine,
        seconds: Number(step.reqHr) || 0,
        waitingSeconds: Number(step.wtngHr) || 0,
      });
    } else {
      const trainNo = String(step.trainno || "");
      if (ride && (ride.line !== line || (ride.trainNo && trainNo && ride.trainNo !== trainNo))) flush();
      if (!ride) {
        ride = {
          type: "ride", line, from, to, segments: 0,
          direction: cleanStationName(step.tmnlStnNm),
          trainNo, departureTime: step.trainDptreTm || null,
          arrivalTime: step.trainArvlTm || null,
        };
      }
      ride.to = to;
      ride.segments += 1;
      if (!ride.direction) ride.direction = cleanStationName(step.tmnlStnNm);
      if (step.trainArvlTm) ride.arrivalTime = step.trainArvlTm;
      if (allStations[allStations.length - 1] !== to) allStations.push(to);
    }
  }
  flush();

  const transferCount = itinerary.filter((item) => item.type === "transfer").length;
  const seconds = Number(body.totalReqHr);
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error("총 소요시간이 유효하지 않습니다.");
  const reportedTransferCount = Number(body.trsitNmtm);

  return {
    origin: ORIGIN,
    destination,
    searchedAt,
    searchType: body.searchType || "duration",
    totalSeconds: seconds,
    totalMeters: Number(body.totalDstc) || 0,
    fareWon: Number(body.totalCardCrg) || 0,
    transferCount: Number.isFinite(reportedTransferCount) ? reportedTransferCount : transferCount,
    itinerary,
    allStations,
    // Minimal diagnostic summary for independent testing, no secret/credential fields.
    diagnostics: { rawSegments: raw.length, parsedTransfers: transferCount },
  };
}

export async function GET(request) {
  const key = process.env.SEOUL_METRO_API_KEY?.trim();
  if (!key) {
    return errorResponse("Vercel 환경변수 SEOUL_METRO_API_KEY가 없습니다. 추가 후 재배포해 주세요.", 503, "NO_API_KEY");
  }

  let params;
  try { params = new URL(request.url).searchParams; }
  catch { return errorResponse("잘못된 요청입니다.", 400, "BAD_URL"); }

  const destinationCode = String(params.get("toCode") || "").trim();
  const selectedStation = destinationCode ? BY_CODE.get(destinationCode) : null;
  if (destinationCode && !selectedStation) return errorResponse("지원하지 않는 역코드입니다.", 400, "BAD_STATION_CODE");
  const destination = selectedStation ? cleanStationName(selectedStation.ko) : cleanStationName(params.get("to"));
  const mode = params.get("mode") || "duration";
  if (!destination || destination.length > 30 || /[<>\r\n\u0000-\u001f]/.test(destination)) {
    return errorResponse("도착역 이름을 1~30자로 입력해 주세요.", 400, "BAD_DESTINATION");
  }
  if (destination === ORIGIN) return errorResponse("도착역은 종로5가역 이외의 역을 선택해 주세요.", 400, "SAME_STATION");
  if (!MODES.has(mode)) return errorResponse("지원하지 않는 검색 유형입니다.", 400, "BAD_MODE");

  const searchedAt = seoulTimestamp();
  const qs = new URLSearchParams({
    serviceKey: key, dataType: "JSON", dptreStn: selectedStation ? "0154" : ORIGIN,
    arvlStn: selectedStation ? destinationCode : destination, searchDt: searchedAt,
    searchType: mode, schInclYn: "Y", stationValueType: selectedStation ? "code" : "name",
  });

  let upstream;
  try {
    upstream = await fetch(`${ENDPOINT}?${qs.toString()}`, {
      method: "GET", headers: { Accept: "application/json" },
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return errorResponse(e?.name === "TimeoutError" || e?.name === "AbortError"
      ? "서울교통공사 API 응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요."
      : "서울교통공사 API에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      502, "UPSTREAM_NETWORK");
  }

  if (!upstream.ok) return errorResponse(`서울교통공사 API HTTP ${upstream.status} 오류입니다.`, 502, "UPSTREAM_HTTP");

  let data;
  try { data = await upstream.json(); }
  catch { return errorResponse("API가 JSON 형식으로 응답하지 않았습니다. 인증키 종류와 dataType 설정을 확인해 주세요.", 502, "INVALID_JSON"); }

  const resultCode = String(data?.header?.resultCode ?? "");
  if (resultCode !== "00" && resultCode !== "0") {
    const friendly = ({
      "01": "출발역 또는 도착역이 입력되지 않았습니다.",
      "02": "검색일시가 입력되지 않았습니다.",
      "10": "출발역 또는 도착역이 존재하지 않습니다. 역명 표기를 확인해 주세요.",
      "11": "검색일시 형식이 올바르지 않습니다.",
      "12": "제외역 목록에 존재하지 않는 역이 있습니다.",
      "13": "경유역 목록에 존재하지 않는 역이 있습니다.",
      "20": "출발역 또는 도착역이 제외역 목록에 포함되어 있습니다.",
      "21": "경유역과 제외역 목록이 중복됩니다.",
      "99": "서울교통공사 서버 내부 오류입니다.",
    })[resultCode];
    return errorResponse(friendly || `경로 조회 실패 (API 코드: ${resultCode || "알 수 없음"})`, 422, `METRO_${resultCode || "UNKNOWN"}`);
  }

  try {
    const route = summarizeRoute(data.body || {}, destination, searchedAt);
    return Response.json({ ok: true, route }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e?.message || "경로를 해석하는 중 문제가 발생했습니다.", 422, "PARSE_ROUTE");
  }
}
