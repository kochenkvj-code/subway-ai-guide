import test from 'node:test';
import assert from 'node:assert/strict';
import {isWithinLiveWindow,kstAlightDateForTime} from '../app/lib/train-lost-time.js';
import {loadAppModule} from './helpers/load-app-module.mjs';

const {findLiveCandidates,followStops,expectedLiveDirection}=await loadAppModule('app/lib/train-lost.js');
const minute=60000;

test('minute-resolution inputs allow all of minute 30 and reject from minute 31',()=>{
 for(const seconds of [0,1,40,59])for(const millis of [0,999]){
  assert.equal(isWithinLiveWindow(29*minute+seconds*1000+millis),true);
  assert.equal(isWithinLiveWindow(30*minute+seconds*1000+millis),true);
  assert.equal(isWithinLiveWindow(31*minute+seconds*1000+millis),false);
 }
 assert.equal(isWithinLiveWindow(31*minute-1),true);
 assert.equal(isWithinLiveWindow(31*minute),false);
});

test('future tolerance, invalid values and the zero-minute input retain their exact limits',()=>{
 assert.equal(isWithinLiveWindow(-120000),true);
 assert.equal(isWithinLiveWindow(-120001),false);
 assert.equal(isWithinLiveWindow(0),true);
 for(const input of [NaN,Infinity,-Infinity,undefined,null,'1800000'])assert.equal(isWithinLiveWindow(input),false);
});

test('manual midnight input resolves yesterday for minute 30, including month/year/leap-day changes',()=>{
 for(const [clock,yesterday]of [
  ['2026-11-15T00:10:59.999+09:00','2026-11-14'],
  ['2026-12-01T00:10:40+09:00','2026-11-30'],
  ['2027-01-01T00:10:40+09:00','2026-12-31'],
  ['2028-03-01T00:10:40+09:00','2028-02-29'],
 ]){
  const now=Date.parse(clock);
  assert.equal(kstAlightDateForTime('23:40',now),yesterday);
  const date=kstAlightDateForTime('23:40',now);
  assert.equal(isWithinLiveWindow(now-Date.parse(date+'T23:40:00+09:00')),true);
  const outsideDate=kstAlightDateForTime('23:39',now);
  assert.equal(isWithinLiveWindow(now-Date.parse(outsideDate+'T23:39:00+09:00')),false);
 }
});

test('same-day manual input and nearby future input keep their current date',()=>{
 const now=Date.parse('2026-11-15T13:30:40+09:00');
 for(const time of ['13:00','13:01','13:30','13:31','13:32'])assert.equal(kstAlightDateForTime(time,now),'2026-11-15');
});

test('candidate calculation accepts 29/30-minute requests and rejects 31-minute requests at nonzero seconds',()=>{
 const line='1',station='종로5가',next='동대문';
 const direction=expectedLiveDirection(line,station,next);
 const position=followStops(line,station,next,18).stops[14];
 for(const clock of ['2026-11-15T13:30:40+09:00','2026-11-15T13:30:59.999+09:00','2026-11-15T00:10:40+09:00']){
  const now=Date.parse(clock);
  const positions=[{line,trainNo:'BOUNDARY',station:position,direction,status:'1',express:false,receivedAt:new Date(now).toISOString()}];
  for(const minutesAgo of [29,30,31]){
   const kst=new Date(now-minutesAgo*minute+9*3600000).toISOString();
   const result=findLiveCandidates(positions,{line,station,next,date:kst.slice(0,10),time:kst.slice(11,16),now});
   if(minutesAgo===31)assert.equal(result.reason,'OUTSIDE_LIVE_WINDOW');
   else{
    assert.equal(result.reason,'LIVE_CANDIDATES',clock+': '+minutesAgo);
    assert.equal(result.candidates[0].number,'BOUNDARY');
   }
  }
 }
});

test('a 30-minute request still rejects stale or wrong-direction positions',()=>{
 const now=Date.parse('2026-11-15T13:30:40+09:00');
 const line='1',station='종로5가',next='동대문',direction=expectedLiveDirection(line,station,next);
 const stop=followStops(line,station,next,18).stops[14];
 const result=findLiveCandidates([
  {line,trainNo:'STALE',station:stop,direction,receivedAt:new Date(now-120001).toISOString()},
  {line,trainNo:'WRONG',station:stop,direction:direction==='0'?'1':'0',receivedAt:new Date(now).toISOString()},
 ],{line,station,next,date:'2026-11-15',time:'13:00',now});
 assert.equal(result.reason,'NO_LIVE_CANDIDATES');
});
