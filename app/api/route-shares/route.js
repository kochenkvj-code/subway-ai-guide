import {interpreterStaff} from '../../lib/interpreter-staff';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {staffAuthorized,staffCookie} from '../../lib/staff-access';
import {supabase} from '../../lib/stats-server';
import {routeShareIdentity} from '../../lib/route-share-identity';
import {shareSnapshot} from '../../lib/route-share-proof';
export const dynamic='force-dynamic';
const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(request){
 const id=new URL(request.url).searchParams.get('id');
 if(!/^[A-Za-z0-9_-]{43}$/.test(id||''))return json({error:'not-found'},404);
 try{const r=await supabase('route_result_shares?'+new URLSearchParams({id:'eq.'+id,expires_at:'gt.'+new Date().toISOString(),select:'snapshot,expires_at',limit:'1'}));const rows=await r.json();return rows[0]?json(rows[0]):json({error:'expired-or-not-found'},404);}catch{return json({error:'unavailable'},503);}
}
export async function POST(request){
 const admin=staffAuthorized(request);
 const ordinary=admin||process.env.ROUTE_SHARE_MODE==='public';
 const roomId=request.headers.get('x-interpreter-room');
 if(!ordinary&&!roomId)return json({error:'admin-required'},403);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'origin'},403);
 try{
  if(Number(request.headers.get('content-length')||0)>360000)return json({error:'too-large'},413);
  const raw=await request.text();if(raw.length>360000)return json({error:'too-large'},413);
  const snapshot=shareSnapshot(JSON.parse(raw));
  const staff=roomId?await interpreterStaff(request,roomId):null;
  if(roomId&&(!staff||staff.station_code!==snapshot.originCode))return json({error:'staff-or-station'},403);
  if(!ordinary&&!staff)return json({error:'admin-required'},403);
  const serialized=JSON.stringify(snapshot);if(Buffer.byteLength(serialized)>100000)return json({error:'too-large'},413);
  const identity=routeShareIdentity(request,{roomId,admin,staffCookie});
  if(!identity)return json({error:'identity-unavailable'},503);
  const creator=createHmac('sha256',process.env.STATS_ADMIN_PASSWORD||process.env.SUPABASE_SECRET_KEY).update('route-share:'+identity).digest('hex');
  const digest=createHash('sha256').update(serialized).digest('hex');
  const result=await(await supabase('rpc/create_route_result_share',{method:'POST',body:JSON.stringify({p_id:randomBytes(32).toString('base64url'),p_creator:creator,p_digest:digest,p_snapshot:snapshot})})).json();
  return result.error?json(result,429):json({id:result.id,expiresAt:result.expiresAt,url:new URL('/route-share/'+result.id,request.url).href});
 }catch(e){return json({error:['invalid-proof','expired-proof','invalid-language','invalid-route','mismatched-results'].includes(e.message)?e.message:'invalid-share'},400);}
}
