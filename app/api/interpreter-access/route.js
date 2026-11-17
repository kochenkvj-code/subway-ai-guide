import {featureAccess} from '../../lib/staff-access';
export const dynamic='force-dynamic';
export async function GET(request){return Response.json({...featureAccess(request),routeShare:featureAccess(request).admin||process.env.ROUTE_SHARE_MODE==='public'},{headers:{'Cache-Control':'no-store'}});}
