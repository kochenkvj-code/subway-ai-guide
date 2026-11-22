import {cookies} from 'next/headers';
import TestAccess from './TestAccess';
import {staffAuthorized} from '../../lib/staff-access';
import OperationTimetableTest from './OperationTimetableTest';
export const dynamic='force-dynamic';export const runtime='nodejs';
export const metadata={title:'신규 API 시간표 테스트',robots:{index:false,follow:false}};
export default async function Page(){
 if(!staffAuthorized({cookies:await cookies()}))return <TestAccess/>;
 return <OperationTimetableTest/>;
}
