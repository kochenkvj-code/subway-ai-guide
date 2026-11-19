import {cookies} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {staffAuthorized} from '../../lib/staff-access';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const metadata={robots:{index:false,follow:false}};
export default async function Page({searchParams}){
 if(!staffAuthorized({cookies:await cookies()}))notFound();
 const q=await searchParams,params=new URLSearchParams({view:'timetable'});
 if(typeof q?.station==='string'&&/^\d{4}$/.test(q.station))params.set('station',q.station);
 if(['ko','en','ja','zh'].includes(q?.lang))params.set('lang',q.lang);
 redirect('/?'+params);
}
