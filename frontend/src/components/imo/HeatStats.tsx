"use client";

import { useState, useEffect } from "react";

interface GitHubStats {
  stars: number;
  forks: number;
  contributors: number;
  hot_level: string;
  hot_reason: string;
  stars_per_day: number;
  days_since_creation: number;
  last_commit_days: number;
}

interface HeatStatsProps {
  projectId: string;
  githubUrl?: string;
}

export function HeatStats({ projectId, githubUrl }: HeatStatsProps) {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      if (!githubUrl) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
        const res = await fetch(`${API_URL}/imo/projects/${projectId}/github`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setStats(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch GitHub stats:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [projectId, githubUrl]);

  // 没有 GitHub URL 的情况
  if (!githubUrl) {
    return (
      <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          热度数据
        </h3>
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">暂无 GitHub 仓库</p>
        </div>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          热度数据
        </h3>
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#FF8C00] border-t-transparent" />
        </div>
      </div>
    );
  }

  // 加载失败
  if (error || !stats) {
    return (
      <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          热度数据
        </h3>
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">数据加载失败</p>
        </div>
      </div>
    );
  }

  // 热度等级颜色
  const getHotLevelColor = (level: string) => {
    switch (level) {
      case '🔥🔥🔥':
        return 'text-red-500';
      case '🔥🔥':
        return 'text-orange-500';
      case '🔥':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
        <span className="text-lg">🔥</span>
        热度数据
        <span className={`ml-auto text-lg ${getHotLevelColor(stats.hot_level)}`}>
          {stats.hot_level || '❄️'}
        </span>
      </h3>
      
      {/* 热度原因 */}
      {stats.hot_reason && (
        <p className="text-sm text-amber-500/80 mb-3 italic">
          {stats.hot_reason}
        </p>
      )}

      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {formatNumber(stats.stars)}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Stars
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {formatNumber(stats.forks)}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 3a3 3 0 00-3 3v4a3 3 0 003 3h2v2a3 3 0 003 3h2a3 3 0 003-3v-2h2a3 3 0 003-3V6a3 3 0 00-3-3H6z" />
            </svg>
            Forks
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {stats.contributors}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            贡献者
          </div>
        </div>
      </div>

      {/* 额外信息 */}
      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between text-gray-400">
          <span>日均新增 Star</span>
          <span className="text-[#10B981] font-mono">
            +{stats.stars_per_day.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center justify-between text-gray-400">
          <span>项目天数</span>
          <span className="font-mono text-gray-300">
            {stats.days_since_creation}d
          </span>
        </div>
        <div className="flex items-center justify-between text-gray-400 col-span-2">
          <span>最近提交</span>
          <span className={`font-mono ${stats.last_commit_days <= 7 ? 'text-[#10B981]' : stats.last_commit_days <= 30 ? 'text-amber-500' : 'text-gray-500'}`}>
            {stats.last_commit_days === 0 ? '今天' : `${stats.last_commit_days}天前`}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 1000).toFixed(1) + 'k';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

export default HeatStats;
