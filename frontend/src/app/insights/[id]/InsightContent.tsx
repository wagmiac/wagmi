// 客户端渲染的文章内容组件
'use client';

import Link from 'next/link';
import { InsightContent as ContentType } from '@/lib/content-api';
import { useI18n } from '@/lib/i18n';

interface InsightContentProps {
  content: ContentType;
}

export default function InsightContent({ content }: InsightContentProps) {
  const { locale } = useI18n();
  const lang = locale;
  
  const displayContent = lang === 'zh' ? content.content_zh : content.content_en;
  
  // 核心创意
  const coreIdea = lang === 'zh' 
    ? (content.core_idea_zh || content.core_idea || '创业洞察')
    : (content.core_idea_en || content.core_idea || 'Startup Insight');
  
  // 关键点
  const keyPoints = lang === 'zh'
    ? (content.key_points_zh || content.key_points || [])
    : (content.key_points_en || content.key_points || []);
  
  // 目标受众
  const targetUsers = lang === 'zh'
    ? (content.target_users_zh || content.target_users || '')
    : (content.target_users_en || content.target_users || '');

  // 收入数据
  const revenueData = lang === 'zh'
    ? (content.revenue_data_zh || content.revenue_data || content.revenue || '')
    : (content.revenue_data_en || content.revenue_data || content.revenue || '');

  return (
    <div className="px-8 py-8">
      {/* 核心创意 - H1 对SEO很重要 */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#FF8C00] mb-4 flex items-center gap-3">
          💡 {coreIdea}
        </h1>
      </div>

      {/* 收入数据 */}
      {revenueData && (
        <div className="mb-6 p-4 bg-[#00E5FF]/10 border border-[#00E5FF]/20 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="text-sm text-gray-400">{lang === 'zh' ? '收入数据' : 'Revenue'}</p>
              <p className="text-xl font-bold text-[#00E5FF]">
                {revenueData}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 详细内容 - 核心SEO内容 */}
      <article className="prose prose-invert max-w-none mb-8">
        <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {displayContent || content.raw_content}
        </div>
      </article>

      {/* 关键点 */}
      {keyPoints && keyPoints.length > 0 && (
        <section className="mb-8">
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
        </section>
      )}

      {/* 目标用户 */}
      {targetUsers && (
        <section className="mb-8 p-4 bg-white/5 rounded-xl">
          <p className="text-sm text-gray-400 mb-1">
            🎯 {lang === 'zh' ? '适合人群' : 'Target Users'}
          </p>
          <p className="text-white">{targetUsers}</p>
        </section>
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
        <footer className="text-sm text-gray-500">
          {lang === 'zh' ? '来源' : 'Source'}:{' '}
          <a
            href={content.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white underline"
          >
            {content.source || content.author || 'Original'}
          </a>
        </footer>
      )}
    </div>
  );
}
