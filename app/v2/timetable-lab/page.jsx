import {cookies} from 'next/headers';
import {notFound} from 'next/navigation';
import {staffAuthorized} from '../../lib/staff-access';
import source from '../../data/timetable-crowding.json';
import TimetableLab from './TimetableLab';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){
 if(!staffAuthorized({cookies:await cookies()}))notFound();
 return <TimetableLab crowdingSource={source}/>;
}
