import {createHmac,timingSafeEqual} from 'node:crypto';
const secret=()=>process.env.ROUTE_SHARE_SIGNING_SECRET||process.env.STATS_ADMIN_PASSWORD||'';
export function signRouteResult(type,data,now=Date.now()){
 if(!secret())return null;
 const encoded=Buffer.from(JSON.stringify({v:1,type,data,issuedAt:now,expiresAt:now+86400000})).toString('base64url');
 return encoded+'.'+createHmac('sha256',secret()).update('route-share:'+encoded).digest('hex');
}
export function readRouteResult(token,type,now=Date.now()){
 if(!secret()||typeof token!=='string'||token.length>180000)throw Error('invalid-proof');
 const [encoded,sig,...extra]=token.split('.');
 const expected=createHmac('sha256',secret()).update('route-share:'+encoded).digest('hex');
 if(extra.length||!/^[a-f0-9]{64}$/.test(sig||'')||!timingSafeEqual(Buffer.from(expected),Buffer.from(sig)))throw Error('invalid-proof');
 const value=JSON.parse(Buffer.from(encoded,'base64url').toString());
 if(value.v!==1||value.type!==type||value.expiresAt<=now||value.issuedAt>now+60000)throw Error('expired-proof');
 return value.data;
}
export function shareSnapshot(body){
 if(!['ko','en','ja','zh'].includes(body.language))throw Error('invalid-language');
 const official=readRouteResult(body.routeProof,'official');
 if(!official.originCode||!official.destinationCode||!official.route?.itinerary?.length)throw Error('invalid-route');
 let place=null;
 if(body.placeProof){
  place=readRouteResult(body.placeProof,'place');
  if(place.status!=='found'||!place.station||place.station.code!==official.destinationCode||place.stationCode!==official.originCode||place.language!==body.language)throw Error('mismatched-results');
 }
 return {version:1,language:body.language,originCode:official.originCode,destinationCode:official.destinationCode,mode:official.mode,route:official.route,place:place?Object.fromEntries(['status','station','place','answer','reason','walk','sources'].map(k=>[k,place[k]??null])):null,searchedAt:official.searchedAt};
}
