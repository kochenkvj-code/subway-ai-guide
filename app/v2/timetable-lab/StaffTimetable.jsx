'use client';
import dynamic from 'next/dynamic';
const OperationTimetable=dynamic(()=>import('../operation-timetable-test/OperationTimetableTest'),{ssr:false});

// One verified timetable presentation for passengers and administrators.
export default function StaffTimetable({lang,stationContext}){
 return <OperationTimetable embedded language={lang} stationContext={stationContext} endpoint="/api/v2/operation-timetable"/>;
}
