// Compare only the OFFICIAL subway-route data. This is not a door-to-door
// comparison: station exits and walking legs are excluded.
const value=(route,key)=>route?.[key]==null||!Number.isFinite(Number(route[key]))?Infinity:Math.max(0,Number(route[key]));
export function preferredRouteOption(options,mode='duration'){
 const usable=(Array.isArray(options)?options:[]).filter(item=>item?.route);
 if(!usable.length)return null;
 const keys=mode==='transfer'?['transferCount','totalSeconds','totalMeters']:mode==='distance'?['totalMeters','totalSeconds','transferCount']:['totalSeconds','transferCount','totalMeters'];
 return [...usable].sort((a,b)=>{
  for(const key of keys){const delta=value(a.route,key)-value(b.route,key);if(Number.isFinite(delta)&&delta!==0)return delta;}
  return 0;
 })[0];
}
