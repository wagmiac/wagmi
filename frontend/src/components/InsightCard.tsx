'use client';

import Link from 'next/link';
import { InsightContent, formatTimeAgo } from '@/lib/content-api';
import CommentSection from './CommentSection';
import FavoriteButton from './FavoriteButton';
import ShareButton from './ShareButton';
import { useI18n } from '@/lib/i18n';

interface InsightCardProps {
  content: InsightContent;
}

export default function InsightCard({ content }: InsightCardProps) {
  const { locale } = useI18n();
  // 直接使用全局语言设置
  const lang = locale;

  // 根据语言显示内容
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

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FF8C00]/30 transition-all duration-300">
      {/* 主体内容 */}
      <div className="p-6">
        {/* 核心创意 - 可点击跳转详情 */}
        <div className="mb-4">
          <Link href={`/insights/${content.slug || content.id}`} className="group">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="text-lg font-semibold text-[#FF8C00] flex items-center gap-2 group-hover:text-[#FFAD33] transition">
                💡 {coreIdea}
              </h3>
              <span className="text-xs text-gray-500 whitespace-nowrap mt-1">
                {formatTimeAgo(content.published_at || content.created_at, locale)}
              </span>
            </div>
          </Link>
        </div>

        {/* 内容摘要 */}
        <div className="mb-4 text-gray-300 leading-relaxed text-sm">
          {displayContent || content.raw_content?.slice(0, 200)}
        </div>

        {/* 收入数据 */}
        {revenueData && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[#00E5FF] font-medium">💰 {lang === 'zh' ? '收入' : 'Revenue'}:</span>
            <span className="text-white">{revenueData}</span>
          </div>
        )}

        {/* 关键点 */}
        {keyPoints && keyPoints.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              🔑 {lang === 'zh' ? '关键点' : 'Key Points'}
            </h4>
            <ul className="space-y-1">
              {keyPoints.slice(0, 3).map((point, idx) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-[#FF8C00]">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 目标受众 */}
        {targetUsers && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-gray-400">🎯 {lang === 'zh' ? '适合' : 'For'}:</span>
            <span className="text-gray-300">{targetUsers}</span>
          </div>
        )}

        {/* 标签 */}
        {content.tags && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {content.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 分享区 */}
      <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShareButton 
            url={`/insights/${content.slug || content.id}`}
            title={coreIdea}
            description={displayContent}
            revenue={revenueData}
            keyPoints={keyPoints}
            targetUsers={targetUsers}
          />
          {/* 浏览量 */}
          {content.view_count !== undefined && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              👁 {content.view_count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <FavoriteButton contentId={content.id} size="sm" />
          {content.source_url && (
            <a
              href={content.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              {lang === 'zh' ? '原文' : 'Source'} →
            </a>
          )}
        </div>
      </div>

      {/* 评论区 */}
      <CommentSection contentId={content.id} lang={lang} />
    </div>
  );
}
