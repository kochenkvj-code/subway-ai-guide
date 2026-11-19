import test from 'node:test';
import assert from 'node:assert/strict';
import {congestionSlot,compactCongestionRow,selectCongestion,decodeCongestionPage,congestionLevel,parseCongestionValue} from '../app/lib/congestion-data.js';
const station={stationCode:'0154',line:'1',names:{ko:'종로5가'}};
const sample=(over={})=>({DOW_SE:'평일',LINE:'1호선',STTN_NO:154,DPTRE_STTN:'종로5가',UP_DOWN_SE:'상선',TIME1630:'65.2',...over});
test('KST half-hour and calendar weekday selection',()=>{
 assert.deepEqual(congestionSlot(Date.parse('2026-11-18T07:44:00Z')),{day:'평일',field:'TIME1630',key:'2026-11-18T16:30',minute:990});
 assert.equal(congestionSlot(Date.parse('2026-11-20T23:30:00Z')).day,'토요일');
 assert.equal(congestionSlot(Date.parse('2026-11-21T23:30:00Z')).day,'일요일');
});
test('exact station, day, direction and line, decimals preserved, absent data not substituted',()=>{
 const slot=congestionSlot(Date.parse('2026-11-18T07:44:00Z'));
 const rows=[sample(),sample({UP_DOWN_SE:'하선',TIME1630:138.8}),sample({LINE:'2호선',TIME1630:190}),sample({DOW_SE:'토요일',TIME1630:90}),sample({STTN_NO:155,TIME1630:200})].map(compactCongestionRow);
 assert.deepEqual(selectCongestion(rows,station,slot),{'0':65.2,'1':138.8});
 assert.deepEqual(selectCongestion(rows,station,{...slot,field:'TIME1700'}),{});
 assert.deepEqual(selectCongestion([...rows,compactCongestionRow(sample({TIME1630:66}))],station,slot),{'1':138.8});
});
test('direction mapping inner/outer and missing or unsupported records',()=>{
 assert.equal(compactCongestionRow(sample({LINE:'2',UP_DOWN_SE:'내선'})).dir,'0');
 assert.equal(compactCongestionRow(sample({LINE:'2',UP_DOWN_SE:'외선'})).dir,'1');
 assert.equal(compactCongestionRow(sample({UP_DOWN_SE:'unknown'})),null);
 for(const v of [null,'','-',0,'0',false,-1])assert.equal(parseCongestionValue(v),null);
 assert.deepEqual([49.99,50,79.99,80,109.99,110].map(congestionLevel),[0,1,1,2,2,3]);
});
test('only complete successful pages accepted, never an error payload',()=>{
 const good={subwConfusion:{RESULT:{CODE:'INFO-000'},list_total_count:2,row:[sample(),sample()]}};
 assert.equal(decodeCongestionPage(good,1,1000).total,2);
 assert.throws(()=>decodeCongestionPage({RESULT:{CODE:'ERROR-301'}},1,1000));
 assert.throws(()=>decodeCongestionPage({...good,subwConfusion:{...good.subwConfusion,row:[sample()]}},1,1000));
});

test('confirmed special statistical identities resolve both live directions without mixing the Seongsu shuttle or wrong lines',()=>{
 const slot=congestionSlot(Date.parse('2026-11-18T07:44:00Z'));
 const rows=[
  sample({LINE:'2',STTN_NO:211,UP_DOWN_SE:'내선',TIME1630:45}),
  sample({LINE:'2',STTN_NO:211,UP_DOWN_SE:'외선',TIME1630:99}),
  sample({LINE:'2',STTN_NO:9001,UP_DOWN_SE:'외선',TIME1630:72}),
  sample({LINE:'2',STTN_NO:9002,UP_DOWN_SE:'외선',TIME1630:22}),
  sample({LINE:'6',STTN_NO:2611,UP_DOWN_SE:'하선',TIME1630:54}),
  sample({LINE:'6',STTN_NO:9006,UP_DOWN_SE:'하선',TIME1630:36}),
  sample({LINE:'6',STTN_NO:9006,UP_DOWN_SE:'상선',TIME1630:88}),
  sample({LINE:'5',STTN_NO:9006,UP_DOWN_SE:'하선',TIME1630:199})
 ].map(compactCongestionRow);
 assert.deepEqual(selectCongestion(rows,{line:'2',stationCode:'0211',names:{ko:'성수'}},slot),{'0':45,'1':72});
 const e={line:'6',stationCode:'2611',names:{ko:'응암'}};
 assert.deepEqual(selectCongestion(rows,e,slot),{'0':36,'1':54});
 assert.deepEqual(selectCongestion(rows.filter(r=>r.code!=='9006'),e,slot),{'1':54});
 assert.deepEqual(selectCongestion([...rows,compactCongestionRow(sample({LINE:'6',STTN_NO:9006,UP_DOWN_SE:'하선',TIME1630:38}))],e,slot),{'1':54});
});
