import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const registry=read('app/data/seoulMetroOfficialStations.json'),coordinates=read('app/data/stationCoordinates.json');
const path='data/sources/seoul-metro-district-20250804.csv',bytes=fs.readFileSync(path);
function csv(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(field.replace(/\r$/,''));field='';if(c==='\n'){rows.push(row);row=[];}}else field+=c;}if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}if(quoted)throw Error('Unclosed CSV quote');return rows.filter(r=>r.some(Boolean));}
const rows=csv(new TextDecoder('euc-kr').decode(bytes)),[header,...districts]=rows;
if(header.join('|')!=='자치구|해당역(호선)|역개수')throw Error('Unexpected source columns');
const lineIds={'1':'1001','2':'1002','3':'1003','4':'1004','5':'1005','6':'1006','7':'1007','8':'1008','9':'1009'};
const colors={'1':'#24559b','2':'#00a84d','3':'#ef7c1c','4':'#00a5de','5':'#996cac','6':'#cd7c2f','7':'#747f00','8':'#e6186c','9':'#bdb092'};
const aliases={'서울|1':'서울역','서울|4':'서울역','이수|4':'총신대입구'};
const corrections=[],unmatched=[],stations=[],seen=new Set();
for(const [district,listed,count]of districts){
 const entries=[...listed.matchAll(/([^,]+?)\((\d+)\)/g)];
 if(entries.length!==Number(count))throw Error('District count mismatch: '+district);
 for(const entry of entries){const sourceName=entry[1].trim(),sourceLine=entry[2];let name=sourceName,line=sourceLine;
 if(['암사','암사역사공원'].includes(name)&&line==='5'){line='8';corrections.push({district,sourceName,sourceLine,name,line,reason:'호선 오기: 기존 역코드 자료의 8호선과 대조. 원문은 보존.'});}
 if(aliases[name+'|'+line]){name=aliases[name+'|'+line];corrections.push({district,sourceName,sourceLine,name,line,reason:'동일 호선의 역명 별칭을 기존 역코드 자료의 표기로 연결.'});}
 const matches=registry.filter(s=>s.ko===name&&s.line===line.padStart(2,'0')+'호선');
 if(matches.length!==1){unmatched.push({district,sourceName,sourceLine,name,line,reason:matches.length?'ambiguous':'not_found'});continue;}
 const s=matches[0],stationCode=s.code;if(!/^\d{4}$/.test(stationCode)||seen.has(stationCode))throw Error('Invalid/duplicate station code: '+stationCode);seen.add(stationCode);
 const point=coordinates[stationCode],valid=point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&point.lat>=33&&point.lat<=39&&point.lng>=124&&point.lng<=132;
 stations.push({stationCode,line,subwayId:lineIds[line],color:colors[line],names:{ko:s.ko,en:s.en,ja:s.ja,zh:s.zh},aliases:[...new Set([sourceName,s.ko])],coordinates:valid?{latitude:point.lat,longitude:point.lng}:null,coordinateId:valid?stationCode:null,scopeStatus:'source-listed',source:{district,name:sourceName,line:sourceLine},legacyIds:stationCode==='0154'?{feedback:'jongno5ga-1'}:{},apiHints:{routeCode:stationCode,stationName:s.ko,lineName:line+'호선',lostFoundPlace:s.ko.endsWith('역')?s.ko:s.ko+'역',verification:'menu-adapters-not-yet-verified'}});
 }
}
stations.sort((a,b)=>a.stationCode.localeCompare(b.stationCode));
const extra=registry.find(s=>s.code==='0200');
const report={schemaVersion:1,scopeVerification:'pending-current-official-source',fieldSources:{stationCodeAndNames:'app/data/seoulMetroOfficialStations.json — 기존 역 검색용 799건이 기준',coordinates:'app/data/stationCoordinates.json — 업로드한 역코드별 좌표 784건',scope:'자치구별 CSV는 운영 대상 후보를 추리는 참고용이며 이름·코드 원본으로 사용하지 않음'},source:{file:path,originalFileName:'서울교통공사_자치구별 지하철역 정보_20250804.CSV',date:'2025-08-04',encoding:'CP949',sha256:createHash('sha256').update(bytes).digest('hex')},counts:{districtRows:districts.length,sourceEntries:districts.reduce((n,r)=>n+Number(r[2]),0),matched:stations.length,withCoordinates:stations.filter(s=>s.coordinates).length,originalRouteRegistry:registry.length,originalCoordinates: Object.keys(coordinates).length},corrections,unmatched,missingCoordinates:stations.filter(s=>!s.coordinates).map(s=>s.stationCode),supplementalCandidates:extra?[{stationCode:extra.code,line:'2',names:{ko:extra.ko,en:extra.en,ja:extra.ja,zh:extra.zh},coordinates:null,status:'review-required',reason:'역코드 자료에는 있으나 첨부 관할 CSV에는 없는 2호선 까치산. 좌표 파일에도 0200 없음. 최신 관할 및 좌표를 확인하기 전 본 목록에 자동 추가하지 않음.'}]:[],limitations:['첨부한 2025-08-04 자치구별 자료를 기반으로 한 운영 대상 후보 목록입니다. 최신 관할역 전체를 별도 공식 원문으로 확인하지 못했습니다.','기존 자료의 다국어 표기를 연결했으며, 번역과 API별 역명은 메뉴 연결 단계에서 검증합니다.','기존 799개 길찾기 목록과 784개 좌표 원본은 수정하지 않았습니다.','기존 피드백 ID는 전환 참고값일 뿐, 1단계에서 DB·인증·기존 메뉴는 변경하지 않습니다.']};
fs.writeFileSync('app/data/seoulMetroStationMaster.json',JSON.stringify({schemaVersion:1,stations},null,2)+'\n');fs.writeFileSync('app/data/seoulMetroStationMasterAudit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.counts));if(unmatched.length)throw Error('Unresolved source matches; inspect audit before release');
