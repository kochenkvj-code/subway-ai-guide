import {isIP} from 'node:net';

// Use only deployment-provided forwarding headers; never collapse visitors into
// a common anonymous quota or trust an unverified staff cookie as an identity.
export function routeShareIdentity(request,{roomId,admin,staffCookie}){
 if(roomId)return 'room:'+roomId;
 if(admin)return 'staff:'+request.cookies?.get(staffCookie)?.value;
 for(const header of ['x-vercel-forwarded-for','x-forwarded-for']){
  const ip=request.headers.get(header)?.split(',')[0].trim();
  if(ip&&isIP(ip))return 'ip:'+ip.toLowerCase();
 }
 return null;
}
