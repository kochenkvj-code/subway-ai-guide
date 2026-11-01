import coordinates from '../data/stationCoordinates.json';
const name=value=>String(value||'').normalize('NFKC').replace(/\s/g,'').replace(/역$/,'');
const line=value=>String(value||'').replace(/\([^)]*\)/g,'').replace(/^0+(?=\d)/,'').replace(/호선$/,'');
export function stationCoordinates(station){
 if(!station)return null;
 const matches=station.coordinateId&&Object.hasOwn(coordinates,station.coordinateId)?[coordinates[station.coordinateId]]:Object.values(coordinates).filter(x=>name(x.name)===name(station.names?.ko||station.name)&&line(x.line)===line(station.line));
 if(matches.length!==1)return null;
 const {lat,lng}=matches[0];
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
 return {latitude:lat,longitude:lng};
}
