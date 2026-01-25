'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Leaderboard from '@/components/Leaderboard';
import HotRanking from '@/components/HotRanking';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface Badge {
  id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  points: number;
}

export default function LeaderboardPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const res = await fetch(`${API_BASE}/badges`);
      if (res.ok) {
        setBadges(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              🏆 社区排行榜
            </h1>
            <p className="text-gray-400 text-lg">
              积极参与社区互动，获得徽章和积分奖励
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* 左侧：积分排行 */}
            <div className="lg:col-span-2">
              <Leaderboard />
            </div>

            {/* 右侧：热门内容 + 徽章展示 */}
            <div className="space-y-6">
              <HotRanking />

              {/* 徽章展示 */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  🎖️ 可获得徽章
                </h3>
                
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-800 rounded-lg"></div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {badges.slice(0, 9).map(badge => (
                      <div
                        key={badge.id}
                        className="flex flex-col items-center p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer group"
                        title={`${badge.name} - ${badge.description}`}
                      >
                        <span className="text-2xl group-hover:scale-110 transition-transform">
                          {badge.icon}
                        </span>
                        <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                          {badge.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {badges.length > 9 && (
                  <p className="text-center text-xs text-gray-500 mt-3">
                    还有 {badges.length - 9} 个徽章待解锁...
                  </p>
                )}
              </div>

              {/* 积分规则 */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  📋 积分规则
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>发表评论</span>
                    <span className="text-green-400">+5</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>收藏内容</span>
                    <span className="text-green-400">+2</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>获得徽章</span>
                    <span className="text-green-400">+10~200</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>连续签到</span>
                    <span className="text-green-400">+3/天</span>
                  </div>
                </div>
              </div>

              {/* 等级说明 */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  📈 等级体系
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { level: 1, name: '新手探索者', points: '0' },
                    { level: 2, name: '活跃学习者', points: '50' },
                    { level: 3, name: '进阶用户', points: '150' },
                    { level: 4, name: '资深玩家', points: '300' },
                    { level: 5, name: '核心成员', points: '500' },
                    { level: 6, name: '社区达人', points: '800' },
                    { level: 7, name: '意见领袖', points: '1200' },
                    { level: 8, name: '超级用户', points: '1800' },
                    { level: 9, name: '传奇贡献者', points: '2500' },
                    { level: 10, name: 'WAGMI大师', points: '5000' },
                  ].map((item, index) => (
                    <div 
                      key={item.level}
                      className={`flex justify-between items-center py-1 ${
                        index < 3 ? 'text-gray-400' : 
                        index < 6 ? 'text-blue-400' :
                        index < 8 ? 'text-purple-400' : 'text-yellow-400'
                      }`}
                    >
                      <span>Lv.{item.level} {item.name}</span>
                      <span className="text-gray-500">{item.points}+</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
