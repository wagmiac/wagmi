'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InsightContent } from '@/lib/content-api';
import { useI18n } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface RelatedContentsProps {
  contentId: string;
  limit?: number;
}

export default function RelatedContents({ contentId, limit = 6 }: RelatedContentsProps) {
  const { locale } = useI18n();
  const [related, setRelated] = useState<InsightContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const res = await fetch(`${API_BASE}/contents/${contentId}/related?limit=${limit}`);
        const data = await res.json();
        if (data.success) {
          setRelated(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch related contents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [contentId, limit]);

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-xl font-bold text-white mb-6">
          📚 {locale === 'zh' ? '相关推荐' : 'Related'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-white/10 rounded mb-3 w-3/4"></div>
              <div className="h-3 bg-white/10 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (related.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold text-white mb-6">
        📚 {locale === 'zh' ? '相关推荐' : 'Related'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {related.map((content) => {
          const coreIdea = locale === 'zh'
            ? (content.core_idea_zh || content.core_idea || '创业洞察')
            : (content.core_idea_en || content.core_idea || 'Startup Insight');
          const displayContent = locale === 'zh'
            ? (content.content_zh || content.raw_content)
            : (content.content_en || content.raw_content);
          
          return (
            <Link
              key={content.id}
              href={`/insights/${content.slug || content.id}`}
              className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF8C00]/30 rounded-xl p-4 transition-all"
            >
              <h3 className="text-[#FF8C00] font-medium mb-2 group-hover:text-[#FFAD33] transition line-clamp-2">
                💡 {coreIdea}
              </h3>
              <p className="text-gray-400 text-sm line-clamp-2">
                {displayContent?.slice(0, 80)}...
              </p>
              {content.tags && content.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {content.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white/5 text-gray-500 text-xs rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
