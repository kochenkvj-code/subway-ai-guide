// Public service route; the test and diagnostic routes keep their own staff checks.
export {operationTimetableResponse as GET} from '../../../lib/operation-timetable-response';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
