'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface LeaderboardEntry {
  user_id: string;
  nickname: string;
  avatar: string;
  points: number;
  badge_count: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/badges/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        // 确保数据是数组
        setEntries(Array.isArray(data) ? data : (data?.data || []));
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-400' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-300' };
    if (rank === 3) return { icon: '🥉', color: 'text-orange-400' };
    return { icon: `#${rank}`, color: 'text-gray-400' };
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-800 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        暂无排行数据
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          🏆 积分排行榜
        </h3>
        <span className="text-xs text-gray-400">Top {entries.length}</span>
      </div>

      <div className="divide-y divide-gray-800">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const { icon, color } = getRankBadge(rank);

          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-4 p-4 transition-colors hover:bg-gray-800/50 ${
                rank <= 3 ? 'bg-gradient-to-r from-yellow-500/5 to-transparent' : ''
              }`}
            >
              {/* 排名 */}
              <div className={`w-10 text-center font-bold text-lg ${color}`}>
                {rank <= 3 ? icon : icon}
              </div>

              {/* 头像 */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
                {entry.avatar ? (
                  <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm">
                    {(entry.nickname || '用户')[0]}
                  </span>
                )}
              </div>

              {/* 用户信息 */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {entry.nickname || '匿名用户'}
                </p>
                <p className="text-xs text-gray-400">
                  {entry.badge_count} 枚徽章
                </p>
              </div>

              {/* 积分 */}
              <div className="text-right">
                <p className="font-bold text-indigo-400">{entry.points}</p>
                <p className="text-xs text-gray-400">积分</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
