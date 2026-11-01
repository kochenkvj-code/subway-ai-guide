import {collectTourPages,tourRows} from '../../lib/tour-pages';
import { TOUR_SERVICES, canonicalTourType } from '../../lib/tour-services';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
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
  const language = input.get('lang') || 'ko';
  if (!Object.hasOwn(TOUR_SERVICES, language)) return reply({error:'지원하지 않는 관광정보 언어입니다.',code:'INVALID_LANGUAGE'},400);
  const config = TOUR_SERVICES[language];
  if (!Object.hasOwn(operations, mode)) return reply({ error: '지원하지 않는 조회 방식입니다.' }, 400);
  const all=input.get('all')==='1';
  if(all&&mode!=='nearby')return reply({error:'전체 조회는 주변 검색에서만 가능합니다.',code:'INVALID_MODE'},400);
  const params = new URLSearchParams({ MobileOS: 'ETC', MobileApp: 'SubwayAIGuide', _type: 'json', numOfRows: all?'100':'20', pageNo: '1' });
  const type = input.get('type') || '';
  if (type && !types.has(type)) return reply({ error: '잘못된 관광 분류입니다.' }, 400);
  if (type && ['nearby','keyword','area'].includes(mode)) {
    if (!config.types[type]) return reply({error:'선택 언어에서 지원하지 않는 관광 분류입니다.',code:'UNSUPPORTED_CATEGORY'},422);
    params.set('contentTypeId', config.types[type]);
  }
  if (mode === 'nearby') {
    const radius = input.get('radius') || '1500';
    if (!['500','1500','3000','5000'].includes(radius)) return reply({ error: '지원하지 않는 검색 반경입니다.' }, 400);
    const longitude = input.get('longitude')?.trim();
    const latitude = input.get('latitude')?.trim();
    const lon = Number(longitude), lat = Number(latitude);
    if (!longitude || !latitude || !Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return reply({ error: '현재 위치의 올바른 위도·경도가 필요합니다. 위치 권한을 허용하고 다시 조회해 주세요.' }, 400);
    }
    for (const [k,v] of Object.entries({ mapX:String(lon), mapY:String(lat), radius, arrange:'E' })) params.set(k,v);
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
  const key = process.env[config.keyName]?.trim();
  if (!key) return reply({ error: `서버 환경변수 ${config.keyName}에 해당 언어 일반 인증키(Decoding)를 설정해 주세요.`,code:'TOUR_NOT_CONFIGURED' }, 503);
  params.set('serviceKey',key);
  const root=`https://apis.data.go.kr/B551011/${config.service}/${operations[mode]}`;
  const controller=new AbortController();
  const timeout=AbortSignal.timeout(all?45000:15000);
  const signals=[controller.signal,timeout,...(request.signal?[request.signal]:[])];
  async function loadPage(page){
    const query=new URLSearchParams(params);query.set('pageNo',String(page));
    const response=await fetch(root+'?'+query,{cache:'no-store',signal:AbortSignal.any(signals)});
    if(!response.ok)throw Object.assign(Error('TourAPI HTTP error'),{code:'TOUR_UPSTREAM'});
    const data=await response.json();
    const resultCode=String(data.response?.header?.resultCode??data.resultCode??'UNKNOWN');
    if(!['0000','00'].includes(resultCode))throw Object.assign(Error('TourAPI result error'),{code:'TOUR_UPSTREAM'});
    return data.response?.body||{};
  }
  try {
    const first=await loadPage(1);
    const complete=all?await collectTourPages(first,loadPage):{rows:tourRows(first),sourceTotal:Number(first.totalCount)||0};
    const list=complete.rows;
    if(mode==='images')return reply({operation:operations[mode],language,images:list.map(x=>({title:plain(x.imgname),url:photo(x.originimgurl||x.smallimageurl),credit:plain(x.cpyrhtDivCd||x.copyrightdivcode)})).filter(x=>x.url)});
    const normalized=list.map(x=>({id:x.contentid,type:canonicalTourType(language,x.contenttypeid),title:plain(x.title),address:plain([x.addr1,x.addr2].filter(Boolean).join(' ')),image:photo(x.firstimage),distance:x.dist,longitude:x.mapx,latitude:x.mapy,description:plain(x.overview),phone:plain(x.tel),homepage:safeLink(x.homepage),start:x.eventstartdate||'',end:x.eventenddate||'',credit:plain(x.cpyrhtDivCd)}));
    const seen=new Set();const items=all?normalized.filter(x=>{if(!x.id||seen.has(String(x.id)))return false;seen.add(String(x.id));return true;}):normalized;
    return reply({operation:operations[mode],language,items,total:all?items.length:complete.sourceTotal,sourceTotal:complete.sourceTotal,complete:all});
  }catch(error){
    controller.abort();
    return reply({error:'관광정보를 모두 불러오지 못했습니다. 잠시 후 다시 시도하거나 반경을 줄여 주세요.',code:['TOUR_TOO_MANY_RESULTS','TOUR_INCOMPLETE'].includes(error.code)?error.code:'TOUR_UPSTREAM'},502);
  }
}
