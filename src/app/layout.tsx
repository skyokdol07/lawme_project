import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LawMe — AI 형사법률 분석',
  description:
    '자연어로 사건을 설명하면 AI가 관련 형사법령을 분석해드립니다. 국가법령정보센터 공식 API를 통해 법조문을 검증합니다.',
  keywords: ['형사법률', '법률분석', '죄명조회', '법정형', '국가법령', 'AI법률'],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
