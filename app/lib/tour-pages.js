const rows=body=>{const value=body?.items?.item;return Array.isArray(value)?value:value&&typeof value==='object'?[value]:[];};
export function tourRows(body){return rows(body);}
export async function collectTourPages(first,loadPage){
 const firstRows=rows(first),total=Number(first.totalCount);
 if(!Number.isSafeInteger(total)||total<0)throw Object.assign(Error('Invalid total'),{code:'TOUR_INCOMPLETE'});
 if(total>5000)throw Object.assign(Error('Too many places'),{code:'TOUR_TOO_MANY_RESULTS'});
 if(!total)return {rows:[],sourceTotal:0};
 const reported=Number(first.numOfRows)||100;
 const size=Math.min(100,reported,firstRows.length);
 if(!size)throw Object.assign(Error('Missing items'),{code:'TOUR_INCOMPLETE'});
 const pages=Math.ceil(total/size);
 if(pages>100)throw Object.assign(Error('Too many pages'),{code:'TOUR_TOO_MANY_RESULTS'});
 const result=[...firstRows];
 for(let start=2;start<=pages;start+=4){
  const batch=await Promise.all(Array.from({length:Math.min(4,pages-start+1)},(_,i)=>loadPage(start+i)));
  for(const body of batch){const page=rows(body);if(!page.length)throw Object.assign(Error('Incomplete page'),{code:'TOUR_INCOMPLETE'});result.push(...page);}
 }
 if(result.length<total)throw Object.assign(Error('Incomplete results'),{code:'TOUR_INCOMPLETE'});
 return {rows:result,sourceTotal:total};
}
