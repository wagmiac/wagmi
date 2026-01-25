'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface RankingContent {
  id: string;
  slug?: string;
  core_idea: string;
  content_zh?: string;
  tags?: string[];
  favorite_count?: number;
  comment_count?: number;
  view_count?: number;
  score?: number;
}

interface HotRankingProps {
  period?: 'day' | 'week' | 'month' | 'all';
  limit?: number;
  showPeriodSelector?: boolean;
}

export default function HotRanking({ 
  period: initialPeriod = 'week', 
  limit = 10,
  showPeriodSelector = true 
}: HotRankingProps) {
  const [contents, setContents] = useState<RankingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(initialPeriod);

  useEffect(() => {
    const fetchHotContents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/ranking/hot?period=${period}&limit=${limit}`);
        const data = await res.json();
        if (data.success) {
          setContents(data.data.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch hot contents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHotContents();
  }, [period, limit]);

  const periodLabels = {
    day: '24小时',
    week: '本周',
    month: '本月',
    all: '全部时间',
  };

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🔥 热门洞察
        </h2>
        {showPeriodSelector && (
          <div className="flex gap-2">
            {(['day', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  period === p
                    ? 'bg-[#FF8C00] text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 bg-white/10 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无热门内容
        </div>
      ) : (
        <div className="space-y-4">
          {contents.map((content, index) => (
            <Link
              key={content.id}
              href={`/insights/${content.slug || content.id}`}
              className="flex gap-4 items-start group hover:bg-white/5 rounded-lg p-2 -mx-2 transition"
            >
              {/* 排名 */}
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                index < 3 
                  ? 'bg-gradient-to-br from-[#FF8C00] to-[#FF6600] text-white' 
                  : 'bg-white/10 text-gray-400'
              }`}>
                {index + 1}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium group-hover:text-[#FF8C00] transition line-clamp-1">
                  {content.core_idea || '创业洞察'}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  {content.favorite_count !== undefined && (
                    <span>❤️ {content.favorite_count}</span>
                  )}
                  {content.comment_count !== undefined && (
                    <span>💬 {content.comment_count}</span>
                  )}
                  {content.view_count !== undefined && (
                    <span>👁 {content.view_count}</span>
                  )}
                </div>
              </div>

              {/* 得分 */}
              {content.score !== undefined && content.score > 0 && (
                <div className="text-[#FF8C00] text-sm font-medium">
                  {content.score} 分
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
