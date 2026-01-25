import { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import InsightsClient from './InsightsClient';

export const metadata: Metadata = {
  title: '创业洞察 | WAGMI',
  description: '发现 AI 时代超级个体的创业故事、收入案例和可复制的方法论。每日更新，启发你的创业灵感。',
  openGraph: {
    title: '创业洞察 | WAGMI',
    description: '发现 AI 时代超级个体的创业故事、收入案例和可复制的方法论。',
  },
};

export default function InsightsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      {/* Content List */}
      <div className="pt-24">
        <InsightsClient />
      </div>

      <Footer />
    </main>
  );
}
