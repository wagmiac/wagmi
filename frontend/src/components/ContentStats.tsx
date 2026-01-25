'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface OverviewStats {
  total_contents: number;
  published_contents: number;
  pending_contents: number;
  total_users: number;
  total_comments: number;
  total_favorites: number;
  today_contents: number;
  today_users: number;
  today_comments: number;
}

interface TagStat {
  tag: string;
  count: number;
}

interface TopContent {
  id: string;
  slug?: string;
  core_idea: string;
  favorite_count: number;
  comment_count: number;
  published_at: string;
}

export default function ContentStats() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [tagDistribution, setTagDistribution] = useState<TagStat[]>([]);
  const [topContents, setTopContents] = useState<TopContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [overviewRes, tagsRes, topRes] = await Promise.all([
        fetch(`${API_BASE}/stats/overview`),
        fetch(`${API_BASE}/stats/tag-distribution`),
        fetch(`${API_BASE}/stats/top-contents`),
      ]);

      const [overviewData, tagsData, topData] = await Promise.all([
        overviewRes.json(),
        tagsRes.json(),
        topRes.json(),
      ]);

      if (overviewData.success) setOverview(overviewData.data);
      if (tagsData.success) setTagDistribution(tagsData.data || []);
      if (topData.success) setTopContents(topData.data || []);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#00D395] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const maxTagCount = Math.max(...tagDistribution.map(t => t.count), 1);

  return (
    <div className="space-y-6">
      {/* 概览统计 */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          📊 内容引擎统计
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-black/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-[#FF8C00]">{overview?.published_contents || 0}</p>
            <p className="text-gray-500 text-sm">已发布洞见</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-[#00D395]">{overview?.total_users || 0}</p>
            <p className="text-gray-500 text-sm">注册用户</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-[#00E5FF]">{overview?.total_comments || 0}</p>
            <p className="text-gray-500 text-sm">讨论评论</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-pink-400">{overview?.total_favorites || 0}</p>
            <p className="text-gray-500 text-sm">收藏次数</p>
          </div>
        </div>

        {/* 今日数据 */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full">
            <span>📝</span>
            <span>今日新增 {overview?.today_contents || 0} 条洞见</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full">
            <span>👤</span>
            <span>今日新增 {overview?.today_users || 0} 位用户</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full">
            <span>💬</span>
            <span>今日新增 {overview?.today_comments || 0} 条评论</span>
          </div>
        </div>
      </div>

      {/* 标签分布 */}
      {tagDistribution.length > 0 && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            🏷️ 热门标签
          </h3>
          <div className="space-y-3">
            {tagDistribution.slice(0, 8).map((tag, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-24 truncate">#{tag.tag}</span>
                <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFD700] rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${(tag.count / maxTagCount) * 100}%` }}
                  >
                    <span className="text-xs text-black font-medium">{tag.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 热门内容 */}
      {topContents.length > 0 && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            🔥 热门洞见
          </h3>
          <div className="space-y-3">
            {topContents.slice(0, 5).map((content, idx) => (
              <Link
                key={content.id}
                href={`/insights/${content.slug || content.id}`}
                className="flex items-start gap-3 p-3 bg-black/30 rounded-lg hover:bg-black/50 transition group"
              >
                <span className="text-2xl font-bold text-gray-600 group-hover:text-[#FF8C00] transition">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate group-hover:text-[#FF8C00] transition">
                    {content.core_idea}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      ❤️ {content.favorite_count}
                    </span>
                    <span className="flex items-center gap-1">
                      💬 {content.comment_count}
                    </span>
                    {content.published_at && (
                      <span>{content.published_at}</span>
                    )}
                  </div>
                </div>
                <span className="text-gray-500 group-hover:text-white transition">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
