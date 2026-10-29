import './globals.css';
import SiteAnalytics from './components/SiteAnalytics';

export const metadata = {
  title: '지하철역 AI 안내',
  description: '승객을 위한 지하철역 AI 안내 챗봇',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}<SiteAnalytics /></body>
    </html>
  );
}
