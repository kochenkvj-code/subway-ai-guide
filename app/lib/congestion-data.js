// Seoul subwConfusion: station / direction / day / half-hour statistics.
const norm=v=>String(v??'').normalize('NFKC').trim();
const days=['일요일','평일','평일','평일','평일','평일','토요일'];
export function congestionSlot(now=Date.now()){
 const seoul=new Date(now+9*3600000);
 const hh=String(seoul.getUTCHours()).padStart(2,'0'),mm=seoul.getUTCMinutes()<30?'00':'30';
 return {day:days[seoul.getUTCDay()],field:'TIME'+hh+mm,key:seoul.toISOString().slice(0,10)+'T'+hh+':'+mm,minute:seoul.getUTCHours()*60+Number(mm)};
}
export function normalizeStationCode(value){
 const s=norm(value);
 return /^\d{1,4}$/.test(s)?s.padStart(4,'0'):null;
}
export function normalizeLine(value){
 const s=norm(value).replace(/호선$/,'').trim();
 return /^[1-8]$/.test(s)?s:null;
}
export function normalizeDirection(value,line){
 const s=norm(value).replace(/\s/g,'');
 if(line==='2'&&['내선','내선순환'].includes(s))return '0';
 if(line==='2'&&['외선','외선순환'].includes(s))return '1';
 if(['상행','상선'].includes(s))return '0';
 if(['하행','하선'].includes(s))return '1';
 return null;
}
// Passenger-facing guidance levels; raw percentages remain unchanged.
export const CONGESTION_THRESHOLDS=[50,80,110];
export function congestionLevel(value){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)return null;
 return CONGESTION_THRESHOLDS.filter(boundary=>value>=boundary).length;
}
export function parseCongestionValue(raw){
 if(typeof raw!=='number'&&typeof raw!=='string')return null;
 if(typeof raw==='string'&&!/^\d+(?:\.\d+)?$/.test(raw.trim()))return null;
 const value=Number(raw);
 // Zero may denote no trains in the source file; do not display as empty seats.
 return Number.isFinite(value)&&value>0?value:null;
}
export function compactCongestionRow(row){
 const day=norm(row?.DOW_SE),line=normalizeLine(row?.LINE),code=normalizeStationCode(row?.STTN_NO);
 const dir=normalizeDirection(row?.UP_DOWN_SE,line);
 if(!['평일','토요일','일요일'].includes(day)||!line||!code||dir===null)return null;
 const slots={};
 for(const [k,v] of Object.entries(row))if(/^TIME\d{4}$/.test(k)){
  const value=parseCongestionValue(v);if(value!==null)slots[k]=value;
 }
 return {day,line,code,dir,slots};
}
export function selectCongestion(rows,station,slot){
 const values={};const ambiguous=new Set();
 // Use exact station number, line, and provider direction, never visual column or name.
 // For the 6-line loop, upstream hints are not through trains at the chosen platform.
 const syntheticUp=station.line==='6'&&['역촌','불광','독바위','연신내','구산'].includes(station.names?.ko);
 for(const row of rows){
  if(row.code!==station.stationCode||row.line!==station.line||row.day!==slot.day||(syntheticUp&&row.dir==='0'))continue;
  const value=row.slots[slot.field];
  if(typeof value!=='number')continue;
  if(Object.hasOwn(values,row.dir)&&values[row.dir]!==value)ambiguous.add(row.dir);
  else values[row.dir]=value;
 }
 for(const dir of ambiguous)delete values[dir];
 return values;
}
export function decodeCongestionPage(data,start,end){
 const p=data?.subwConfusion;
 if(p?.RESULT?.CODE!=='INFO-000'||!Array.isArray(p.row))throw Error('UPSTREAM_RESULT');
 const total=Number(p.list_total_count);
 if(!Number.isInteger(total)||total<1||total>10000||p.row.length!==Math.min(end,total)-start+1)throw Error('UPSTREAM_PAGE');
 return {total,rows:p.row};
}
