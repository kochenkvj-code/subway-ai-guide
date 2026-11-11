import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTrainNo,timetableStatus,compareTimetable,closestSchedule} from '../app/lib/train-lost-validation.mjs';
const trains=[
 {trainNo:'0179',station:'대방',express:false},
 {trainNo:'1143',station:'구로',express:true},
 {trainNo:'1145',station:'대방',express:true},
 {trainNo:'2000',station:'노량진',express:false}
];
const full={ok:true,truncated:false,rows:[
 {number:'179',arrival:'19:25'},{number:'01145',arrival:'19:22'},
 {number:'2000',arrival:'19:27'}]};
test('number comparisons normalize only leading zeros, not number prefixes',()=>{
 assert.equal(normalizeTrainNo('00179'),'179');
 assert.equal(normalizeTrainNo('K1145'),'K1145');
 assert.equal(normalizeTrainNo('1145'),'1145');
});
test('cross-check is not hard-coded to express or any train number range',()=>{
 const checked=compareTimetable(trains,full,{excludeUnlisted:true});
 assert.deepEqual(checked.eligible.map(x=>x.trainNo),['0179','1145','2000']);
 assert.deepEqual(checked.excluded.map(x=>x.position.trainNo),['1143']);
 assert.deepEqual(checked.counts,{matched:3,notListed:1,unknown:0});
});
test('time-table absence remains explicitly unverified, not confirmed skipped',()=>{
 assert.equal(timetableStatus({trainNo:'1143'},full).kind,'not-listed');
 assert.equal(timetableStatus({trainNo:'1143'},{ok:false}).kind,'unknown');
 assert.equal(timetableStatus({trainNo:'1143'},{ok:true,rows:[]}).kind,'unknown');
 assert.equal(timetableStatus({trainNo:'1143'},{...full,truncated:true}).kind,'unknown');
 assert.equal(compareTimetable(trains,{ok:false},{excludeUnlisted:true}).eligible.length,4);
});
test('valid partial timetable can confirm a train without excluding other trains',()=>{
 const partial={...full,truncated:true};
 assert.equal(timetableStatus({trainNo:'1145'},partial).kind,'matched');
 assert.equal(timetableStatus({trainNo:'1143'},partial).kind,'unknown');
});
test('close matching schedule time is diagnostic, not a deletion gate',()=>{
 const list=[{number:'1145',arrival:'19:02'},{number:'1145',arrival:'19:23'}];
 assert.equal(closestSchedule(list,'19:24').arrival,'19:23');
});
