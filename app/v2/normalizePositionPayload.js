// Validate Seoul realtimePosition responses without confusing an empty service
// window (INFO-200) with a malformed or unavailable upstream response.
export function normalizePositionPayload(payload,requestedLine,ok){
 const data=payload&&typeof payload==='object'?payload:{};
 const raw=data.raw&&typeof data.raw==='object'?data.raw:{};
 const code=raw.realtimePosition?.RESULT?.CODE||raw.errorMessage?.code||raw.RESULT?.CODE||'';
 if(!ok||(code&&!['INFO-000','INFO-200'].includes(code)))
  throw Error(data.error||code||'POSITION_ERROR');
 if(String(data.line)!==String(requestedLine))throw Error('POSITION_LINE_MISMATCH');
 if(Array.isArray(raw.realtimePositionList))return data;
 if(code==='INFO-200')return {...data,raw:{...raw,realtimePositionList:[]}};
 throw Error('INVALID_POSITION_DATA');
}
