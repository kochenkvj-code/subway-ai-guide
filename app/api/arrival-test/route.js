import { arrivalStationConfig } from '../../lib/station-arrivals';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const stationCode = new URL(request.url).searchParams.get('station');
  const config = arrivalStationConfig(stationCode);
  if (!config) return Response.json({ error: 'INVALID_STATION' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  const apiKey = process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: 'NOT_CONFIGURED' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    const url = ['http://swopenapi.seoul.go.kr/api/subway', encodeURIComponent(apiKey), 'json', 'realtimeStationArrival', '0', '100', encodeURIComponent(config.apiName)].join('/');
    const upstream = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    const payload = await upstream.json();
    return Response.json({
      station: config.station,
      requestedStationName: config.apiName,
      fetchedAt: new Date().toISOString(),
      upstreamHttpStatus: upstream.status,
      raw: payload
    }, { status: upstream.ok ? 200 : 502, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch {
    return Response.json({ error: 'UPSTREAM_ERROR' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
