import {NextResponse} from 'next/server';
import {FEEDBACK_STATIONS} from '../../../../lib/feedback-config';
import {feedbackCount} from '../../../../lib/feedback-server';
export const runtime='nodejs';
export async function GET(request){
 const station=new URL(request.url).searchParams.get('station');
 if(!Object.hasOwn(FEEDBACK_STATIONS,station))return NextResponse.json({error:'station'},{status:400});
 try{return NextResponse.json({count:await feedbackCount(station)},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'unavailable'},{status:503});}
}
