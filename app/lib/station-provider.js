import {getStationByCode} from './station-master';
export const cleanStation=value=>String(value||'').normalize('NFKC').replace(/역$/,'').replace(/\s/g,'');
export function providerStation(code){
 const station=getStationByCode(code);if(!station)return null;
 return {...station,queryName:station.names.ko.replace(/역$/,'')};
}
export function stationRowMatches(row,station){
 if(row.stnCd&&String(row.stnCd)!==station.stationCode)return false;
 const name=row.stnNm??row.stnName??row.stationName;
 if(!name)return false;
 const aliases=[station.names.ko,...station.aliases];
 if(station.stationCode==='0409')aliases.push('당고개');
 if(station.stationCode==='0432')aliases.push('총신대입구(이수)');
 const line=row.lineNm??row.lineName;
 return aliases.some(alias=>cleanStation(alias)===cleanStation(name))&&(!line||String(line).replace(/\s/g,'').replace(/^0/,'')===station.line+'호선');
}
