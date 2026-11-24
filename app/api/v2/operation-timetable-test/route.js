import {staffAuthorized} from '../../../lib/staff-access';
import {operationTimetableResponse} from '../../../lib/operation-timetable-response';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(request){
 if(!staffAuthorized(request))return Response.json({ok:false,error:'FORBIDDEN'},{status:403,headers:{'Cache-Control':'private, no-store'}});
 return operationTimetableResponse(request);
}
