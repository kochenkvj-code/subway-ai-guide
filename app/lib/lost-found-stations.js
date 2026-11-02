import {getStationByCode,stationMaster} from './station-master';
import agencies from '../data/lostFoundAgencies.json';
// LOST112 accepts custody-agency names, not our station/line IDs. Resolve the
// entry identity here and require explicit station wording in local filtering.
export function lostFoundStation(code){
 const s=getStationByCode(code);if(!s)return null;
 const agencyName=name=>String(name).replace(/역$/,'')+'역';
 const verified=agencies.stations[code];
 return {...s,id:s.stationCode,placeName:verified?.name||agencyName(s.names.ko),
  providerOrganizationId:verified?.organizationId||null,
  requiresLineIdentity:stationMaster.some(other=>other.stationCode!==code&&other.names.ko===s.names.ko),
  lostFoundAliases:[...new Set([s.names.ko,...s.aliases].map(agencyName))]};
}
