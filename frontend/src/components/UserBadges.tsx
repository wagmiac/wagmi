'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface Badge {
  id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  threshold: number;
  points: number;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

interface UserPointsInfo {
  total_points: number;
  badge_count: number;
  level: number;
  level_name: string;
  next_level_points: number;
}

interface PointHistory {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

export default function UserBadges() {
  const { token, user } = useAuth();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [pointsInfo, setPointsInfo] = useState<UserPointsInfo | null>(null);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'badges' | 'history'>('badges');
  const [checkingBadges, setCheckingBadges] = useState(false);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取所有徽章定义
      const badgesRes = await fetch(`${API_BASE}/badges`);
      if (badgesRes.ok) {
        setAllBadges(await badgesRes.json());
      }

      if (token) {
        // 获取用户已获得的徽章
        const userBadgesRes = await fetch(`${API_BASE}/badges/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (userBadgesRes.ok) {
          setUserBadges(await userBadgesRes.json());
        }

        // 获取积分信息
        const pointsRes = await fetch(`${API_BASE}/badges/points`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (pointsRes.ok) {
          setPointsInfo(await pointsRes.json());
        }

        // 获取积分历史
        const historyRes = await fetch(`${API_BASE}/badges/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (historyRes.ok) {
          setHistory(await historyRes.json());
        }
      }
    } catch (error) {
      console.error('Failed to fetch badge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewBadges = async () => {
    if (!token) return;
    setCheckingBadges(true);
    try {
      const res = await fetch(`${API_BASE}/badges/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0) {
          setNewBadges(data.new_badges);
          // 刷新数据
          fetchData();
        }
      }
    } catch (error) {
      console.error('Failed to check badges:', error);
    } finally {
      setCheckingBadges(false);
    }
  };

  const categoryNames: Record<string, string> = {
    engagement: '互动参与',
    contribution: '内容贡献',
    milestone: '里程碑',
    special: '特殊成就'
  };

  const groupedBadges = allBadges.reduce((acc, badge) => {
    const cat = badge.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-800 rounded-lg"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 新获得徽章提示 */}
      {newBadges.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">🎉 恭喜获得新徽章!</h3>
          <div className="flex justify-center gap-4 flex-wrap">
            {newBadges.map(badge => (
              <div key={badge.id} className="flex flex-col items-center">
                <span className="text-4xl mb-2">{badge.icon}</span>
                <span className="text-white font-medium">{badge.name}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setNewBadges([])}
            className="mt-4 text-sm text-gray-400 hover:text-white"
          >
            关闭
          </button>
        </div>
      )}

      {/* 积分概览 */}
      {pointsInfo && (
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Lv.{pointsInfo.level} {pointsInfo.level_name}
              </h3>
              <p className="text-gray-400 text-sm">
                {pointsInfo.total_points} 积分 · {pointsInfo.badge_count} 枚徽章
              </p>
            </div>
            <button
              onClick={checkForNewBadges}
              disabled={checkingBadges}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm disabled:opacity-50"
            >
              {checkingBadges ? '检查中...' : '🔍 检查新徽章'}
            </button>
          </div>

          {/* 等级进度条 */}
          {pointsInfo.next_level_points > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>下一等级</span>
                <span>{pointsInfo.total_points} / {pointsInfo.next_level_points}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{
                    width: `${Math.min((pointsInfo.total_points / pointsInfo.next_level_points) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 标签切换 */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            activeTab === 'badges'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          🏆 徽章墙 ({earnedBadgeIds.size}/{allBadges.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          📊 积分记录
        </button>
      </div>

      {activeTab === 'badges' && (
        <div className="space-y-8">
          {Object.entries(groupedBadges).map(([category, badges]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>{categoryNames[category] || category}</span>
                <span className="text-sm font-normal text-gray-400">
                  ({badges.filter(b => earnedBadgeIds.has(b.id)).length}/{badges.length})
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {badges.map(badge => {
                  const earned = earnedBadgeIds.has(badge.id);
                  const userBadge = userBadges.find(ub => ub.badge_id === badge.id);

                  return (
                    <div
                      key={badge.id}
                      className={`relative p-4 rounded-xl border transition-all ${
                        earned
                          ? 'border-yellow-500/50 bg-yellow-500/10'
                          : 'border-gray-700 bg-gray-800/50 opacity-50 grayscale'
                      }`}
                    >
                      <div className="text-center">
                        <span className="text-3xl block mb-2">{badge.icon}</span>
                        <h4 className="font-medium text-white text-sm">{badge.name}</h4>
                        <p className="text-xs text-gray-400 mt-1">{badge.description}</p>
                        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: badge.color + '30', color: badge.color }}
                          >
                            +{badge.points}分
                          </span>
                        </div>
                        {earned && userBadge && (
                          <p className="text-xs text-yellow-400 mt-2">
                            ✓ {new Date(userBadge.earned_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {earned && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              暂无积分记录
            </div>
          ) : (
            history.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="text-white text-sm">{item.reason}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`font-medium ${item.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.points > 0 ? '+' : ''}{item.points}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
