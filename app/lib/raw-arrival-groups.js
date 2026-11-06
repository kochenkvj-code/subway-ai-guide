// Select only the requested subway line and the provider's own order buckets.
// Do not calculate ETA, infer freshness, deduplicate trains, or drop status codes.
const DIRECTIONS=['상행','하행','내선','외선'];
const rank=row=>String(row?.ordkey??'').slice(1,2);
export function rawArrivalGroups(payload,station){
  const all=Array.isArray(payload?.realtimeArrivalList)?payload.realtimeArrivalList:[];
  const lineRows=all.filter(row=>String(row.subwayId)===String(station?.subwayId));
  const present=[...new Set(lineRows.map(row=>row.updnLine).filter(Boolean))];
  const directions=present.length?[...DIRECTIONS.filter(dir=>present.includes(dir)),...present.filter(dir=>!DIRECTIONS.includes(dir))]:['상행','하행'];
  return directions.map(provider=>{
    const rows=lineRows.filter(row=>row.updnLine===provider);
    const first=rows.filter(row=>rank(row)==='1');
    const second=rows.filter(row=>rank(row)==='2');
    const other=rows.filter(row=>!['1','2'].includes(rank(row)));
    const nextStations=[...new Set(rows.map(row=>String(row.trainLineNm||'').match(/[-–—]\s*(.+?)\s*방면\s*$/)?.[1]?.trim()).filter(Boolean))];
    return {provider,first,second,other,nextStations,total:rows.length};
  });
}
