// Compare JSON values without changing values, array order, or the original rows.
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
 return JSON.stringify(value);
}
export function uniqueFacilityRecords(rows,type){
 const seen=new Set(),identities=new Map(),result=[];
 for(const row of rows){
  const signature=canonical(row);
  if(seen.has(signature))continue;
  seen.add(signature);
  const id=type==='locker'?row.lckrId:row.fcltNo;
  if(id!==undefined&&id!==null&&id!==''){
   const identity=JSON.stringify([row.stnCd,row.lineNm,id,type==='locker'?row.lckrDtlId:null]);
   const previous=identities.get(identity);
   if(previous){
    const fields=[...new Set([...Object.keys(previous),...Object.keys(row)])].filter(key=>canonical(previous[key])!==canonical(row[key]));
    // Diagnostic metadata only: never log whole provider records or credentials.
    console.warn('FACILITY_RECORD_CONFLICT',{type,fields});
   }else identities.set(identity,row);
  }
  result.push(row);
 }
 return result;
}
