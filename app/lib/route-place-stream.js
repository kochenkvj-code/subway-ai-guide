/**
 * Decode complete SSE frames without relying on network chunk boundaries.
 * Each frame has one JSON 'data:' value; an incomplete final frame is retained.
 */
export function splitPlaceStreamFrames(buffer){
 const source=String(buffer||'').replace(/\r\n/g,'\n');
 const frames=[];
 let offset=0,index;
 while((index=source.indexOf('\n\n',offset))>=0){
  const frame=source.slice(offset,index);
  const payload=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
  if(payload)frames.push(payload);
  offset=index+2;
 }
 return {frames,remainder:source.slice(offset)};
}

/** Never expose route_station / menu_recommendation protocol tags mid-stream. */
export function visiblePlaceDraft(raw){
 const source=String(raw||'');
 const lineTag=source.search(/(?:^|\n)\s*<(?:route_station|menu_recommendation)/i);
 const candidate=lineTag>=0?source.slice(0,lineTag):source;
 // A model's next metadata tag may be arriving one character at a time.
 return candidate.replace(/(?:\n\s*)?<\/?[a-z_]*$/i,'').trim();
}
