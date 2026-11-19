import {staffAuthorized} from '../../../../lib/staff-access';
import source from '../../../../data/timetable-crowding.json';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
export async function GET(request){
 if(!staffAuthorized(request))return Response.json({error:'FORBIDDEN'},{status:403,headers});
 return Response.json(source,{headers});
}
