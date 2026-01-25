'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/lib/auth-context';
import { InsightContent } from '@/lib/content-api';
import InsightCard from '@/components/InsightCard';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface PopularTag {
  tag: string;
  count: number;
}

export default function FeedPage() {
  const { user, token } = useAuth();
  const [contents, setContents] = useState<InsightContent[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.data.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    }
  }, [token]);

  const fetchFeed = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/subscriptions/feed`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setContents(data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPopularTags = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/subscriptions/popular-tags`);
      const data = await res.json();
      if (data.success) {
        setPopularTags(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch popular tags:', err);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchFeed();
    fetchPopularTags();
  }, [fetchSubscriptions, fetchFeed, fetchPopularTags]);

  const handleSubscribe = async (tag: string) => {
    if (!token) {
      alert('请先登录');
      return;
    }
    try {
      await fetch(`${API_BASE}/subscriptions/${encodeURIComponent(tag)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setSubscriptions([...subscriptions, tag]);
      fetchFeed();
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  const handleUnsubscribe = async (tag: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/subscriptions/${encodeURIComponent(tag)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setSubscriptions(subscriptions.filter(t => t !== tag));
      fetchFeed();
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <main className="pt-32 pb-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="text-6xl mb-6">🔔</div>
            <h1 className="text-3xl font-bold text-white mb-4">我的订阅源</h1>
            <p className="text-gray-400 mb-8">登录后订阅感兴趣的标签，获取个性化内容推送</p>
            <Link
              href="/auth/callback"
              className="inline-block px-8 py-3 bg-[#FF8C00] text-black font-semibold rounded-full hover:bg-[#FFAD33] transition"
            >
              立即登录
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 主内容区 */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-6">🔔 我的订阅源</h1>
              
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF8C00]"></div>
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-2xl">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-gray-400 mb-2">还没有订阅任何标签</p>
                  <p className="text-gray-500 text-sm">从右侧热门标签开始订阅吧</p>
                </div>
              ) : contents.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-2xl">
                  <div className="text-5xl mb-4">📝</div>
                  <p className="text-gray-400">订阅的标签暂无新内容</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contents.map((content) => (
                    <InsightCard key={content.id} content={content} />
                  ))}
                </div>
              )}
            </div>

            {/* 侧边栏 */}
            <div className="w-full lg:w-80 space-y-6">
              {/* 我的订阅 */}
              {subscriptions.length > 0 && (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
                  <h2 className="text-white font-semibold mb-4">已订阅标签</h2>
                  <div className="flex flex-wrap gap-2">
                    {subscriptions.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleUnsubscribe(tag)}
                        className="px-3 py-1 bg-[#FF8C00]/20 text-[#FF8C00] rounded-full text-sm hover:bg-red-500/20 hover:text-red-400 transition group"
                      >
                        #{tag}
                        <span className="ml-1 opacity-0 group-hover:opacity-100">✕</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 热门标签推荐 */}
              <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
                <h2 className="text-white font-semibold mb-4">🔥 热门标签</h2>
                <div className="space-y-2">
                  {popularTags.slice(0, 10).map((item) => (
                    <div
                      key={item.tag}
                      className="flex items-center justify-between"
                    >
                      <span className="text-gray-300">#{item.tag}</span>
                      {subscriptions.includes(item.tag) ? (
                        <button
                          onClick={() => handleUnsubscribe(item.tag)}
                          className="text-xs px-2 py-1 bg-white/10 text-gray-400 rounded-full hover:text-red-400 transition"
                        >
                          已订阅
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(item.tag)}
                          className="text-xs px-2 py-1 bg-[#FF8C00]/20 text-[#FF8C00] rounded-full hover:bg-[#FF8C00]/30 transition"
                        >
                          + 订阅
                        </button>
                      )}
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
