'use client';

import { useEffect } from 'react';
import { InsightContent, formatTimeAgo } from '@/lib/content-api';
import CommentSection from '@/components/CommentSection';
import ReadingProgress from '@/components/ReadingProgress';
import ShareButton from '@/components/ShareButton';
import FavoriteButton from '@/components/FavoriteButton';
import RelatedContents from '@/components/RelatedContents';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface InsightInteractionsProps {
  contentId: string;
  publishedAt?: string;
  content?: InsightContent;
  showActions?: boolean;
}

export default function InsightInteractions({ 
  contentId, 
  publishedAt,
  content,
  showActions = false 
}: InsightInteractionsProps) {
  const { locale } = useI18n();
  const { token } = useAuth();

  // 记录浏览历史
  useEffect(() => {
    const recordView = async () => {
      try {
        await fetch(`${API_BASE}/history/view/${contentId}`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
      } catch {
        // 静默失败
      }
    };
    recordView();
  }, [contentId, token]);

  // 头部：只显示时间
  if (!showActions) {
    return (
      <>
        <ReadingProgress />
        <div className="flex items-center justify-end px-8 py-6 border-b border-white/5">
          <span className="text-sm text-gray-500">
            {formatTimeAgo(publishedAt || '', locale)}
          </span>
        </div>
      </>
    );
  }

  // CTA 区域和交互
  if (!content) return null;

  const coreIdea = locale === 'zh' 
    ? (content.core_idea_zh || content.core_idea || '创业洞察')
    : (content.core_idea_en || content.core_idea || 'Startup Insight');

  const displayContent = locale === 'zh' ? content.content_zh : content.content_en;
  
  const keyPoints = locale === 'zh'
    ? (content.key_points_zh || content.key_points || [])
    : (content.key_points_en || content.key_points || []);
  
  const targetUsers = locale === 'zh'
    ? (content.target_users_zh || content.target_users || '')
    : (content.target_users_en || content.target_users || '');
  
  const revenueData = locale === 'zh'
    ? (content.revenue_data_zh || content.revenue_data || content.revenue || '')
    : (content.revenue_data_en || content.revenue_data || content.revenue || '');

  return (
    <>
      {/* 分享和收藏区域 */}
      <div className="px-8 py-6 border-t border-white/5 flex items-center justify-center gap-6">
        <FavoriteButton contentId={contentId} size="lg" showCount />
        <ShareButton 
          url={`/insights/${content.slug || contentId}`}
          title={coreIdea}
          description={displayContent}
          revenue={revenueData}
          keyPoints={keyPoints}
          targetUsers={targetUsers}
        />
      </div>

      {/* 评论区 */}
      <CommentSection contentId={contentId} lang={locale} defaultExpanded={true} />

      {/* 相关内容推荐 */}
      <div className="mt-8">
        <RelatedContents contentId={contentId} limit={6} />
      </div>
    </>
  );
}
