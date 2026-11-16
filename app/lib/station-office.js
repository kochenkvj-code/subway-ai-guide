// Explicitly approved same-name cross-line mappings. Never choose the first
// same-name result dynamically, or replace the passenger's base-station code.
const sharedCodes={
 '0311':{code:'2615',line:'6'},'0321':{code:'0423',line:'4'},'2530':{code:'2627',line:'6'},'2538':{code:'2635',line:'6'},'2545':{code:'2727',line:'7'},
 '2548':{code:'2812',line:'8'},'2558':{code:'0342',line:'3'},'2646':{code:'2719',line:'7'},'2818':{code:'0340',line:'3'}
};
const clean=value=>String(value||'').normalize('NFKC').replace(/\s/g,'').replace(/역$/,'');
export function stationOfficeFor(station,records){
 if(!station||station.stationCode==='2810'||!['1','2','3','4','5','6','7','8'].includes(station.line))return {status:'excluded',category:null};
 const matches=(code,line)=>records.filter(row=>row.stnCd===code&&clean(row.stnNm)===clean(station.names.ko)&&
  String(row.lineNm||'').replace(/^0/,'')===line+'호선');
 let items=matches(station.stationCode,station.line),sourceCode=station.stationCode;
 if(!items.length&&sharedCodes[station.stationCode]){sourceCode=sharedCodes[station.stationCode].code;items=matches(sourceCode,sharedCodes[station.stationCode].line);}
 if(!items.length)return {status:'missing',category:null};
 return {status:sourceCode===station.stationCode?'direct':'shared',sourceStationCode:sourceCode,
  category:{id:'customerOffice',items:items.map(row=>({...row})),count:items.length}};
}
