// Counts describe browser IDs and measured sessions, never verified people/bots.
export function visitorSummaries(groups,activity={}){
 const visitors=new Map();
 for(const group of groups){
  const id=group.events.find(e=>e.visitor_id)?.visitor_id;if(!id)continue;
  const item=visitors.get(id)||{id,sessions:0,events:0,shortSessions:0};
  item.sessions++;item.events+=group.events.length;
  const duration=activity[group.first.session_id];
  if(typeof duration==='number'&&Number.isFinite(duration)&&duration>=0&&duration<=15000)item.shortSessions++;
  visitors.set(id,item);
 }
 return visitors;
}
