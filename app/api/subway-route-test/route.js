// Temporary, fixed-case compatibility test. Never exposes the API key.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ENDPOINT = "https://apis.data.go.kr/B553766/path2/getShtrmPath2";
const CASES = {
  gangnam: { label: "종로5가 → 강남(2호선)", destination: "강남", code: "0222" },
  forest: { label: "종로5가 → 서울숲", destination: "서울숲", code: "1847" },
};
function timestamp() {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23" }).formatToParts(new Date());
  const get = k => p.find(x=>x.type===k)?.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}
async function probe(key, test, type, when) {
  const qs = new URLSearchParams({
    serviceKey:key, dataType:"JSON", dptreStn:type==="code"?"0154":"종로5가",
    arvlStn:type==="code"?test.code:test.destination, searchDt:when,
    searchType:"duration",schInclYn:"Y",stationValueType:type
  });
  try {
    const response = await fetch(`${ENDPOINT}?${qs}`, {cache:"no-store",signal:AbortSignal.timeout(15000)});
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { return {type,httpStatus:response.status,error:"JSON 응답이 아님",sample:raw.slice(0,180)}; }
    const paths = data?.body?.paths;
    return {
      type,httpStatus:response.status,resultCode:String(data?.header?.resultCode??""),
      resultMsg:String(data?.header?.resultMsg??"").slice(0,150),
      totalSeconds:data?.body?.totalReqHr??null,
      totalMeters:data?.body?.totalDstc??null,
      segmentCount:Array.isArray(paths)?paths.length:null,
      firstStation:paths?.[0]?.dptreStn?.stnNm??null,
      lastStation:paths?.[paths.length-1]?.arvlStn?.stnNm??null,
      firstStationCode:paths?.[0]?.dptreStn?.stnCd??null,
      lastStationCode:paths?.[paths.length-1]?.arvlStn?.stnCd??null
    };
  } catch(e) {return {type,error:e?.name==="TimeoutError"?"응답 시간 초과":"연결 오류"};}
}
export async function GET(request) {
  const key=process.env.SEOUL_METRO_API_KEY?.trim();
  if(!key)return Response.json({ok:false,error:"SEOUL_METRO_API_KEY 환경변수가 없습니다."},{status:503});
  const id=new URL(request.url).searchParams.get("case")||"gangnam";
  const test=CASES[id];
  if(!test)return Response.json({ok:false,error:"지원하지 않는 테스트입니다."},{status:400});
  const when=timestamp();
  const [byName,byCode]=await Promise.all([probe(key,test,"name",when),probe(key,test,"code",when)]);
  const success=x=>(x.resultCode==="00"||x.resultCode==="0")&&x.segmentCount>0;
  const matched=success(byName)&&success(byCode)&&byName.firstStation===byCode.firstStation&&byName.lastStation===byCode.lastStation;
  return Response.json({ok:true,test:test.label,expected:{originCode:"0154",destinationCode:test.code},searchedAt:when,compatible:matched,byName,byCode},{headers:{"Cache-Control":"no-store"}});
}
