'use client';
import dynamic from 'next/dynamic';
const OperationTimetable=dynamic(()=>import('../operation-timetable-test/OperationTimetableTest'),{ssr:false});

// Administrator view only. The ordinary timetable and its API remain unchanged.
export default function StaffTimetable({lang,stationContext}){
 return <OperationTimetable embedded language={lang} stationContext={stationContext} endpoint="/api/v2/operation-timetable"/>;
}
