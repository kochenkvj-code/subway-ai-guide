import {randomUUID} from 'node:crypto';
import {supabase} from '../../../lib/stats-server';
import {sanitizePassengerText} from '../../../lib/route-place-policy';
import {translateRouteFields} from '../../../lib/translate-route-fields';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request){
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'origin'},403);
 let id,language,attempt,stage='request';const startedAt=Date.now();
 const reply=(value,status=200)=>{console.info('[route-share-translation]',{stage,language:language||'unknown',outcome:status>=400?'failed':value.pending?'pending':'success',reason:value.error||null,elapsedMs:Date.now()-startedAt});return json(value,status);};
 try{
  const raw=await request.text();if(raw.length>300)return reply({error:'invalid'},400);
  ({id,language}=JSON.parse(raw));if(!/^[A-Za-z0-9_-]{43}$/.test(id||'')||!['ko','en','ja','zh'].includes(language))return reply({error:'invalid'},400);
  stage='snapshot';
  const rows=await(await supabase('route_result_shares?'+new URLSearchParams({id:'eq.'+id,expires_at:'gt.'+new Date().toISOString(),select:'snapshot',limit:'1'}))).json();
  if(!rows[0])return reply({error:'expired'},404);const snapshot=rows[0].snapshot;
  const sourceLang=snapshot.language||'ko';const p=snapshot.place;
  if(!p||sourceLang===language)return reply({fields:p?Object.fromEntries(['place','answer','walk','reason'].map(k=>[k,sanitizePassengerText(p[k]||'',language)])):null});
  stage='claim';attempt=randomUUID();
  const claimed=await(await supabase('rpc/route_translation_claim',{method:'POST',body:JSON.stringify({p_id:id,p_language:language,p_attempt:attempt})})).json();
  if(claimed.error)return reply({error:claimed.error},429);
  if(claimed.state==='completed')return reply({fields:claimed.fields});
  if(claimed.state==='pending'){attempt=null;return reply({pending:true},202);}
  const source=Object.fromEntries(['place','answer','walk','reason'].map(k=>[k,sanitizePassengerText(p[k]||'',sourceLang)]));
  stage='translation';
  const fields=await translateRouteFields(source,sourceLang,language,p.station);
  stage='save';
  const finished=await(await supabase('rpc/route_translation_finish',{method:'POST',body:JSON.stringify({p_id:id,p_language:language,p_attempt:attempt,p_fields:fields,p_failed:false})})).json();
  if(!finished)return reply({error:'expired-or-retried'},409);
  return reply({fields});
 }catch{if(attempt)await supabase('rpc/route_translation_finish',{method:'POST',body:JSON.stringify({p_id:id,p_language:language,p_attempt:attempt,p_fields:null,p_failed:true})}).catch(()=>{});return reply({error:'translation-unavailable'},503);}
}
