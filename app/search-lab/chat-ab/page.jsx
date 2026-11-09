import ChatAB from './ChatAB';
import './chat-ab.css';
export const metadata={
  title:'AI 응답 정책 A/B/C 실험실 · Subway AI Guide',
  robots:{index:false,follow:false},
};
export const dynamic='force-dynamic';
export default function Page(){return <ChatAB/>;}
