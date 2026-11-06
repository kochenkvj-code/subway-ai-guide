import { arrivalStationConfig } from '../../../lib/station-arrivals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };

// Manual, one-shot diagnostic: never save, cache, log, or return the user's key.
export async function POST(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers: noStore });
  }

  let input;
  try { input = await request.json(); }
  catch { return Response.json({ error: 'INVALID_REQUEST' }, { status: 400, headers: noStore }); }

  const stationCode = typeof input?.station === 'string' ? input.station : '';
  const apiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : '';
  const config = arrivalStationConfig(stationCode);
  if (!config) return Response.json({ error: 'INVALID_STATION' }, { status: 400, headers: noStore });
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(apiKey)) {
    return Response.json({ error: 'INVALID_API_KEY_FORMAT' }, { status: 400, headers: noStore });
  }

  try {
    const target = [
      'http://swopenapi.seoul.go.kr/api/subway',
      encodeURIComponent(apiKey), 'json', 'realtimeStationArrival',
      '0', '100', encodeURIComponent(config.apiName),
    ].join('/');
    const upstream = await fetch(target, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    const raw = await upstream.json();
    return Response.json({
      station: config.station,
      requestedStationName: config.apiName,
      fetchedAt: new Date().toISOString(),
      upstreamHttpStatus: upstream.status,
      raw,
    }, { status: upstream.ok ? 200 : 502, headers: noStore });
  } catch {
    return Response.json({ error: 'UPSTREAM_ERROR' }, { status: 502, headers: noStore });
  }
}
