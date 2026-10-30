import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptTime, normalizeArrivals, arrivalStatus } from '../app/lib/train-arrivals.js';
const now=Date.parse('2026-10-30T03:00:00Z');
const kst=ms=>new Date(ms+9*3600000).toISOString().slice(0,19).replace('T',' ');
const row=(changes={})=>({subwayId:'1001',statnNm:'종로5가',updnLine:'상행',arvlCd:'99',recptnDt:kst(now),barvlDt:'180',btrainNo:'1234',bstatnNm:'연천',ordkey:'01002연천0',...changes});
const normalize=rows=>normalizeArrivals({realtimeArrivalList:rows},now);
test('KST timestamps and both directions are mapped without inventing destinations',()=>{
 assert.equal(receiptTime('2026-10-30 12:00:00'),now);
 assert.ok(Number.isNaN(receiptTime('invalid')));
 const data=normalize([row(),row({updnLine:'하행',btrainNo:'5678',bstatnNm:'인천'})]);
 assert.equal(data.groups[0].nextStation,'동대문');assert.equal(data.groups[1].nextStation,'종로3가');
 assert.equal(data.groups[0].trains[0].destination,'연천');assert.equal(data.groups[1].trains[0].destination,'인천');
});
test('other lines/stations, departed trains and invalid/stale feed timestamps are excluded',()=>{
 const data=normalize([row({subwayId:'1004'}),row({statnNm:'서울'}),row({updnLine:'내선'}),row({arvlCd:'2'}),row({recptnDt:kst(now-181000)}),row({recptnDt:'invalid'}),row({recptnDt:kst(now+61000)})]);
 assert.ok(data.groups.every(x=>!x.trains.length));assert.equal(data.status,'stale');
});
test('remaining time is corrected for feed age and expired estimates never become false arrivals',()=>{
 const train=normalize([row({recptnDt:kst(now-60000),barvlDt:'180'})]).groups[0].trains[0];
 assert.equal(train.estimatedAt,new Date(now+120000).toISOString());
 assert.deepEqual(arrivalStatus(train,now),{state:'minutes',minutes:2});
 assert.deepEqual(arrivalStatus(train,now+90000),{state:'minutes',minutes:1});
 assert.equal(arrivalStatus(train,now+120000),null);
});
test('zero/unknown ETAs are not shown as zero minutes, and arrival states expire',()=>{
 const unknown=normalize([row({barvlDt:'0'})]).groups[0].trains[0];assert.equal(unknown.estimatedAt,null);assert.equal(arrivalStatus(unknown,now),null);
 const arrived=normalize([row({barvlDt:'0',arvlCd:'1'})]).groups[0].trains[0];assert.deepEqual(arrivalStatus(arrived,now),{state:'arrived'});assert.equal(arrivalStatus(arrived,now+61000),null);
 assert.equal(normalize([row({arvlCd:'1',recptnDt:kst(now-61000)})]).groups[0].trains.length,0);
 const previous=normalize([row({barvlDt:'0',arvlCd:'3'})]).groups[0].trains[0];assert.deepEqual(arrivalStatus(previous,now),{state:'previousDeparted'});
});
test('duplicate trains keep the newest update; first-train rank precedes following trains',()=>{
 const data=normalize([row({recptnDt:kst(now-10000),bstatnNm:'old'}),row(),row({ordkey:'02001소요산0',btrainNo:'next',barvlDt:'30'})]);
 assert.equal(data.groups[0].trains.length,2);assert.equal(data.groups[0].trains[0].trainNo,'1234');assert.equal(data.groups[0].trains[0].destination,'연천');
 assert.equal(normalize([]).status,'empty');
});
