import {featureAccess} from '../../lib/staff-access';
export const dynamic='force-dynamic';
export async function GET(request){return Response.json(featureAccess(request),{headers:{'Cache-Control':'no-store'}});}
