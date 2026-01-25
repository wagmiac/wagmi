'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InsightContent, formatTimeAgo } from '@/lib/content-api';
import CommentSection from '@/components/CommentSection';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ReadingProgress from '@/components/ReadingProgress';
import ShareButton from '@/components/ShareButton';
import FavoriteButton from '@/components/FavoriteButton';
import RelatedContents from '@/components/RelatedContents';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface InsightDetailClientProps {
  content: InsightContent;
}

export default function InsightDetailClient({ content }: InsightDetailClientProps) {
  const { locale } = useI18n();
  // 默认跟随全局语言设置
  const [lang, setLang] = useState<'zh' | 'en'>(locale);
  const { token } = useAuth();

  // 当全局语言变化时，同步更新
  useEffect(() => {
    setLang(locale);
  }, [locale]);

  const displayContent = lang === 'zh' ? content.content_zh : content.content_en;
  
  // 核心创意：优先使用双语字段，兼容旧数据
  const coreIdea = lang === 'zh' 
    ? (content.core_idea_zh || content.core_idea || '创业洞察')
    : (content.core_idea_en || content.core_idea || 'Startup Insight');
  
  // 关键点：优先使用双语字段
  const keyPoints = lang === 'zh'
    ? (content.key_points_zh || content.key_points || [])
    : (content.key_points_en || content.key_points || []);
  
  // 目标受众：优先使用双语字段
  const targetUsers = lang === 'zh'
    ? (content.target_users_zh || content.target_users || '')
    : (content.target_users_en || content.target_users || '');

  // 收入数据：优先使用双语字段
  const revenueData = lang === 'zh'
    ? (content.revenue_data_zh || content.revenue_data || content.revenue || '')
    : (content.revenue_data_en || content.revenue_data || content.revenue || '');

  // 记录浏览历史
  useEffect(() => {
    const recordView = async () => {
      try {
        await fetch(`${API_BASE}/history/view/${content.id}`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
      } catch {
        // 静默失败
      }
    };
    recordView();
  }, [content.id, token]);

  return (
    <>
      <ReadingProgress />
      <Navigation />
      <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* 返回按钮 */}
          <Link
            href="/insights"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-8"
          >
            ← {lang === 'zh' ? '返回洞察列表' : 'Back to Insights'}
          </Link>

          {/* 主卡片 */}
          <article className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLang('zh')}
                  className={`px-4 py-2 rounded-full transition ${
                    lang === 'zh'
                      ? 'bg-[#FF8C00] text-black font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🇨🇳 中文
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-4 py-2 rounded-full transition ${
                    lang === 'en'
                      ? 'bg-[#FF8C00] text-black font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🇺🇸 English
                </button>
              </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {formatTimeAgo(content.published_at || content.created_at)}
              </span>
              {content.view_count !== undefined && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  👁 {content.view_count}
                </span>
              )}
            </div>
            </div>

            {/* 内容区 */}
            <div className="px-8 py-8">
              {/* 核心创意 */}
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-[#FF8C00] mb-4 flex items-center gap-3">
                  💡 {coreIdea}
                </h1>
              </div>

              {/* 收入数据 */}
              {(content.revenue_data || content.revenue) && (
                <div className="mb-6 p-4 bg-[#00E5FF]/10 border border-[#00E5FF]/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="text-sm text-gray-400">{lang === 'zh' ? '收入数据' : 'Revenue'}</p>
                      <p className="text-xl font-bold text-[#00E5FF]">
                        {content.revenue_data || content.revenue}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 详细内容 */}
              <div className="prose prose-invert max-w-none mb-8">
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {displayContent || content.raw_content}
                </div>
              </div>

              {/* 关键点 */}
              {keyPoints && keyPoints.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    🔑 {lang === 'zh' ? '关键要点' : 'Key Points'}
                  </h2>
                  <ul className="space-y-3">
                    {keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-300">
                        <span className="text-[#FF8C00] mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 目标用户 */}
              {targetUsers && (
                <div className="mb-8 p-4 bg-white/5 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">
                    🎯 {lang === 'zh' ? '适合人群' : 'Target Users'}
                  </p>
                  <p className="text-white">{targetUsers}</p>
                </div>
              )}

              {/* 标签 */}
              {content.tags && content.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {content.tags.map((tag, idx) => (
                    <Link
                      key={idx}
                      href={`/insights?tag=${encodeURIComponent(tag)}`}
                      className="px-3 py-1 bg-white/5 text-gray-400 text-sm rounded-full hover:bg-white/10 transition"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* 来源 */}
              {content.source_url && (
                <div className="text-sm text-gray-500">
                  {lang === 'zh' ? '来源' : 'Source'}:{' '}
                  <a
                    href={content.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white underline"
                  >
                    {content.source || content.author || 'Original'}
                  </a>
                </div>
              )}
            </div>

            {/* CTA 区域 */}
            <div className="px-8 py-6 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href={`/idea-evaluator?idea=${encodeURIComponent(coreIdea)}`}
                className="flex flex-col items-center gap-2 py-4 rounded-xl bg-white/5 hover:bg-[#FF8C00]/10 transition"
              >
                <span className="text-2xl">💡</span>
                <span className="text-sm text-gray-300">{lang === 'zh' ? '评估这个创意' : 'Evaluate Idea'}</span>
              </Link>
              <Link
                href={`/ai-mentor?context=${encodeURIComponent(coreIdea)}`}
                className="flex flex-col items-center gap-2 py-4 rounded-xl bg-white/5 hover:bg-[#00E5FF]/10 transition"
              >
                <span className="text-2xl">🤖</span>
                <span className="text-sm text-gray-300">{lang === 'zh' ? '咨询AI导师' : 'Ask AI Mentor'}</span>
              </Link>
              <Link
                href={`/apply?ref=${content.id}`}
                className="flex flex-col items-center gap-2 py-4 rounded-xl bg-white/5 hover:bg-green-500/10 transition"
              >
                <span className="text-2xl">🚀</span>
                <span className="text-sm text-gray-300">{lang === 'zh' ? '申请孵化' : 'Apply Incubation'}</span>
              </Link>
              <div className="flex flex-col items-center gap-2 py-4 rounded-xl bg-white/5">
                <FavoriteButton contentId={content.id} size="lg" showCount />
                <ShareButton 
                  url={`/insights/${content.slug || content.id}`}
                  title={coreIdea}
                  description={displayContent}
                  revenue={revenueData}
                  keyPoints={keyPoints}
                  targetUsers={targetUsers}
                />
              </div>
            </div>

            {/* 评论区 */}
            <CommentSection contentId={content.id} lang={lang} defaultExpanded={true} />
          </article>

          {/* 相关内容推荐 */}
          <RelatedContents contentId={content.id} limit={6} />
        </div>
      </main>
      <Footer />
    </>
  );
}
