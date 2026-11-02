import {stationMaster} from './station-master';
// All station-scoped features share the canonical station code, including transfer lines.
export const FEEDBACK_STATIONS=Object.fromEntries(stationMaster.map(s=>[s.stationCode,{id:s.stationCode,line:s.line,coordinateId:s.coordinateId,color:s.color,names:{...s.names,ko:s.names.ko.endsWith('역')?s.names.ko:s.names.ko+'역'}}]));
export const DEFAULT_FEEDBACK_STATION=FEEDBACK_STATIONS['0154'];
export const FEEDBACK_TYPES = ['equipment','signage','cleanliness','convenience','idea','other','praise'];
export const FEEDBACK_LOCATIONS = ['gate','platform','restroom','exit','other','concourse'];
export function validateFeedback(data) {
  const station = data && Object.hasOwn(FEEDBACK_STATIONS,data.station) ? FEEDBACK_STATIONS[data.station] : null;
  if (!station || !FEEDBACK_TYPES.includes(data.type) || !['ko','en','ja','zh'].includes(data.language)) return null;
  const content = typeof data.content === 'string' ? data.content.trim() : '';
  const detail = typeof data.detail === 'string' ? data.detail.trim() : '';
  const location = data.location || null;
  if (!content || content.length > 500 || detail.length > 60 || (location && !FEEDBACK_LOCATIONS.includes(location)) || (!location && detail)) return null;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content+detail)) return null;
  if (typeof data.request_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.request_id)) return null;
  return { station_id:station.id, line:station.line, type:data.type, location, location_detail:detail, content, language:data.language, request_id:data.request_id };
}
