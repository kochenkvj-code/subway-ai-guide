import {createHash,timingSafeEqual} from 'node:crypto';
import {supabase} from './stats-server';
export async function interpreterStaff(request,id){
 if(!/^[a-f0-9-]{36}$/i.test(id||''))return null;
 const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');if(token.length<32||token.length>100)return null;
 const rows=await(await supabase('interpreter_test_rooms?'+new URLSearchParams({id:'eq.'+id,select:'station_code,staff_token_hash,expires_at,closed_at',limit:'1'}))).json();const r=rows[0];
 if(!r||r.closed_at||Date.parse(r.expires_at)<=Date.now())return null;
 const hash=createHash('sha256').update(token).digest('hex');return r.staff_token_hash?.length===64&&timingSafeEqual(Buffer.from(hash),Buffer.from(r.staff_token_hash))?r:null;
}
