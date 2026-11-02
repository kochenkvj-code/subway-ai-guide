import StationEntry from './StationEntry';
export const metadata = { title:'지하철 AI 안내 V2', robots:{ index:false, follow:false } };
export default function V2Page() { return <StationEntry basePath="/v2" selectorEnabled={process.env.V2_DEVELOPMENT_STATION_SELECTOR !== 'off'} />; }
