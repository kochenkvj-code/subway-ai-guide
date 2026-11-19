import {unstable_cache} from 'next/cache';
import {compactCongestionRow,decodeCongestionPage} from './congestion-data';
let pending=null;
async function fetchPage(key,start,end){
 const url='http://openapi.seoul.go.kr:8088/'+encodeURIComponent(key)+'/json/subwConfusion/'+start+'/'+end+'/';
 let res;
 try{res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'});}
 catch{throw Error('UPSTREAM_NETWORK');}
 if(!res.ok)throw Error('UPSTREAM_HTTP');
 let data;try{data=await res.json();}catch{throw Error('UPSTREAM_JSON');}
 return decodeCongestionPage(data,start,end);
}
async function refreshData(){
 const key=process.env.SEOUL_CONGESTION_API_KEY?.trim();
 if(!key)throw Error('NOT_CONFIGURED');
 const first=await fetchPage(key,1,1000);
 const pages=[first];
 for(let start=1001;start<=first.total;start+=1000)pages.push(await fetchPage(key,start,Math.min(first.total,start+999)));
 if(pages.some(p=>p.total!==first.total))throw Error('UPSTREAM_PAGE');
 const rows=pages.flatMap(p=>p.rows).map(compactCongestionRow).filter(Boolean);
 if(!rows.length||!rows.some(r=>Object.keys(r.slots).length))throw Error('UPSTREAM_SCHEMA');
 console.info('[congestion-refresh]',{count:first.total,usable:rows.length,pages:pages.length});
 return {rows,fetchedAt:new Date().toISOString(),sourceCount:first.total};
}
// Persist only a successful complete dataset; daily revalidation, no key in cache or response.
// Existing station-position requests never wait on this cache or this API.
export const getDataset=unstable_cache(async()=>{
 if(!pending)pending=refreshData().finally(()=>{pending=null;});
 return pending;
},['seoul-subwConfusion-v1'],{revalidate:86400});
