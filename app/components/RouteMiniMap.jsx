"use client";

const COLORS = {
  "1호선":"#1757ad","2호선":"#188f51","3호선":"#da7a18","4호선":"#1a9bc9",
  "5호선":"#8a4ca0","6호선":"#996d22","7호선":"#58671c","8호선":"#cc276a",
  "9호선":"#8d7b3f","신분당선":"#bd2732","경의중앙선":"#609d87","수인분당선":"#e7aa20",
};
const LABEL = {
  ko:{title:"노선도 보기",hint:"좌우로 밀어 경로 확인",transfer:"환승"},
  en:{title:"Route map",hint:"Swipe sideways to view route",transfer:"Transfer"},
  ja:{title:"路線図を見る",hint:"左右にスクロール",transfer:"乗換"},
  zh:{title:"查看路线图",hint:"左右滑动查看",transfer:"换乘"},
};
const color = (line) => COLORS[line] || "#53687a";

export default function RouteMiniMap({ itinerary = [], lang = "ko", display, lineName }) {
  const t = LABEL[lang] || LABEL.ko;
  const rides = itinerary.filter(step => step.type === "ride");
  if (!rides.length) return null;

  // Each ride owns its stations; adjacent rides share their transfer station.
  // The diagram is schematic: it represents station order, not geography.
  const points = [];
  const edges = [];
  rides.forEach((ride, rideIndex) => {
    const stations = Array.isArray(ride.stations) && ride.stations.length > 1
      ? ride.stations : [ride.from, ride.to];
    stations.forEach((name, stationIndex) => {
      if (!name) return;
      let index = points.length - 1;
      if (!points.length || points[index].name !== name) {
        points.push({ name, lines: [ride.line], transfer: false });
        index = points.length - 1;
      } else if (!points[index].lines.includes(ride.line)) {
        points[index].lines.push(ride.line);
        points[index].transfer = true;
      }
      if (stationIndex > 0 && index > 0) edges.push({ from: index - 1, to: index, line: ride.line });
    });
    if (rideIndex < rides.length - 1 && points.length) {
      // Transfer points are highlighted even when the API represents
      // interchange with different station names.
      const last = points[points.length - 1];
      if (last.name === rides[rideIndex + 1].from) last.transfer = true;
    }
  });
  if (points.length < 2) return null;

  const spacing = 116;
  const start = 65;
  const width = Math.max(340, start * 2 + (points.length - 1) * spacing);
  const y = 110;
  const height = 230;
  return <details className="srg-map-disclosure">
    <summary><span>🗺️ {t.title}</span><span aria-hidden="true">⌄</span></summary>
    <div className="srg-map-scroll" role="region" tabIndex={0} aria-label={t.title}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={t.title}>
        {edges.map((edge,i) => <line key={i} x1={start+edge.from*spacing} y1={y} x2={start+edge.to*spacing} y2={y} stroke={color(edge.line)} strokeWidth="9" strokeLinecap="round"/>)}
        {points.map((point,i) => {
          const x = start+i*spacing;
          const major = point.transfer || i===0 || i===points.length-1;
          const labelY = i%2===0 ? 49 : 157;
          return <g key={i}>
            <circle cx={x} cy={y} r={major?12:7} fill="#fff" stroke={color(point.lines[point.lines.length-1])} strokeWidth={major?4:3}/>
            {major && <circle cx={x} cy={y} r="3" fill={color(point.lines[0])}/>}
            <line x1={x} y1={i%2===0?y-15:y+15} x2={x} y2={i%2===0?labelY+22:labelY-14} stroke="#9db1b8" strokeWidth="1.5" strokeDasharray="3 3"/>
            <text x={x} y={labelY} fill="#243b46" fontSize="12" fontWeight={major?"700":"500"} textAnchor="middle">
              {display(point.name).length > 16 ? display(point.name).slice(0,15)+"…" : display(point.name)}
            </text>
            {point.transfer && <text x={x} y={labelY+15} fontSize="10" fontWeight="700" textAnchor="middle" fill="#087c68">{t.transfer}</text>}
            <g transform={`translate(${x-(point.lines.length*24-4)/2},${i%2===0?labelY-35:labelY+24})`}>
              {point.lines.map((line,j) => <g key={line} transform={`translate(${j*24},0)`}>
                <rect width="20" height="19" rx="5" fill={color(line)}/>
                <text x="10" y="13.5" fontSize="10" fontWeight="700" textAnchor="middle" fill="white">{/^0?([1-9])호선$/.test(line)?line.match(/^0?([1-9])호선$/)[1]:"●"}</text>
                <title>{lineName(line,lang)}</title>
              </g>)}
            </g>
          </g>;
        })}
      </svg>
    </div>
    <p className="srg-map-hint">{t.hint} ↔</p>
    <style>{`
      .srg-map-disclosure{border-top:1px solid #e6eeee;margin-top:12px;padding-top:12px}
      .srg-map-disclosure>summary{display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:12px;font-weight:750;color:#24343b;list-style:none}
      .srg-map-disclosure>summary::-webkit-details-marker{display:none}
      .srg-map-disclosure[open]>summary>span:last-child{transform:rotate(180deg)}
      .srg-map-scroll{margin-top:10px;overflow-x:auto;overflow-y:hidden;max-width:100%;border:1px solid #e4edef;border-radius:10px;background:#fbfdfd;-webkit-overflow-scrolling:touch;touch-action:pan-x}
      .srg-map-scroll svg{display:block;max-width:none}
      .srg-map-hint{margin:6px 0 0;color:#758a91;font-size:10px;text-align:right}
    `}</style>
  </details>;
}
