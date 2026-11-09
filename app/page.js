import StationEntry from './v2/StationEntry';

export default function Home() {
  return <StationEntry basePath="/" selectorEnabled={process.env.V2_DEVELOPMENT_STATION_SELECTOR !== 'off'} />;
}
