import {createHmac,timingSafeEqual} from 'node:crypto';
export const staffCookie='sag_staff_access';
const secret=()=>process.env.STATS_ADMIN_PASSWORD||'';
const sign=x=>createHmac('sha256',secret()).update('staff-access:'+x).digest('hex');
export function staffSession(expiresAt=Date.now()+8*3600000){const expiry=String(Math.min(expiresAt,Date.now()+8*3600000));return expiry+'.'+sign(expiry);}
export function staffAuthorized(request){
 if(!secret())return false;
 const [expiry,sig]=(request.cookies?.get(staffCookie)?.value||'').split('.');
 return /^\d{13}$/.test(expiry||'')&&Number(expiry)>Date.now()&&/^[a-f0-9]{64}$/.test(sig||'')&&timingSafeEqual(Buffer.from(sign(expiry)),Buffer.from(sig));
}
export function featureAccess(request){
 const admin=staffAuthorized(request);
 const mode=['admin','trial','station'].includes(process.env.INTERPRETER_MODE)?process.env.INTERPRETER_MODE:'admin';
 return {mode,admin,interpreter:admin||mode!=='admin',qr:admin||process.env.QR_SHARE_MODE==='public'};
}
export function allowRoomCreation(request,body){
 const a=featureAccess(request);
 return a.admin||a.mode==='trial'||(a.mode==='station'&&/^\d{4}$/.test(body.stationCode||'')&&body.stationPin===body.stationCode);
}
