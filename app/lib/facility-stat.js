// Stable identifiers shared by collection, API validation and the admin view.
export const FACILITY_LABELS = {
  facility_kiosk: '발매기·키오스크',
  facility_restroom: '화장실',
  facility_lockers: '물품보관함',
  facility_customerOffice: '고객안전실',
  facility_elevator: '엘리베이터',
  facility_nursingRoom: '수유실',
};
export const isFacilityContext = value => typeof value === 'string' && Object.hasOwn(FACILITY_LABELS, value);
export function facilityContext(type) {
  const canonical = { office:'customerOffice', nursing:'nursingRoom' }[type] || type;
  const value = `facility_${canonical}`;
  return isFacilityContext(value) ? value : null;
}
