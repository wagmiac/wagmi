'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ViewHistory from '@/components/ViewHistory';
import UserBadges from '@/components/UserBadges';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface UserComment {
  id: number;
  content: string;
  content_id: number;
  content_title?: string;
  created_at: string;
}

interface UserFavorite {
  id: string;
  content_id: string;
  created_at: string;
  content?: {
    id: string;
    core_idea: string;
    content_zh?: string;
  };
}

interface UserStats {
  total_comments: number;
  total_favorites: number;
  joined_days: number;
}

export default function ProfileClient() {
  const router = useRouter();
  const { user, token, loading: authLoading, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [comments, setComments] = useState<UserComment[]>([]);
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'favorites' | 'comments' | 'history' | 'badges' | 'settings'>('profile');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setAvatar(user.avatar || '');
      fetchUserComments();
      fetchUserFavorites();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserComments = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/comments/user`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const fetchUserFavorites = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFavorites(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  };

  const fetchUserStats = async () => {
    if (!token || !user) return;
    // 计算加入天数
    const joinedDate = new Date(user.id.slice(0, 8)); // UUID timestamp approximation
    const days = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
    setStats({
      total_comments: comments.length,
      total_favorites: favorites.length,
      joined_days: Math.max(1, days),
    });
  };

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      setError('昵称不能为空');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(nickname.trim(), avatar.trim());
      setSuccess('保存成功！');
      setIsEditing(false);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getLoginMethodIcon = () => {
    if (user?.google_id) return '🔵';
    if (user?.twitter_id) return '𝕏';
    if (user?.wallet_address) return '🔗';
    return '👤';
  };

  const getLoginMethodName = () => {
    if (user?.google_id) return 'Google 账号';
    if (user?.twitter_id) return `Twitter ${user.twitter_handle || ''}`;
    if (user?.wallet_address) {
      const addr = user.wallet_address;
      return `${user.wallet_type || 'Wallet'} (${addr.slice(0, 6)}...${addr.slice(-4)})`;
    }
    return '未知';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00D395] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-24">
        {/* 头部 */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* 头像 */}
            <div className="relative">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.nickname}
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-[#00D395] to-[#00A67E] rounded-full flex items-center justify-center text-3xl font-bold text-black">
                  {user.nickname?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 text-2xl">{getLoginMethodIcon()}</span>
            </div>

            {/* 信息 */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{user.nickname}</h1>
              <p className="text-gray-400 mb-4">{getLoginMethodName()}</p>
              
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500">收藏数</span>
                  <p className="text-xl font-bold text-pink-400">{favorites.length}</p>
                </div>
                <div>
                  <span className="text-gray-500">评论数</span>
                  <p className="text-xl font-bold text-[#00D395]">{comments.length}</p>
                </div>
                <div>
                  <span className="text-gray-500">加入天数</span>
                  <p className="text-xl font-bold text-white">{stats?.joined_days || 1}</p>
                </div>
                {user.role === 'admin' && (
                  <div>
                    <span className="text-gray-500">角色</span>
                    <p className="text-xl font-bold text-yellow-500">管理员</p>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition text-sm"
              >
                编辑资料
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 rounded-lg transition text-sm"
                >
                  管理后台
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-4 mb-6 border-b border-white/10 overflow-x-auto">
          {[
            { id: 'profile', label: '个人资料' },
            { id: 'favorites', label: '我的收藏' },
            { id: 'comments', label: '我的评论' },
            { id: 'history', label: '浏览历史' },
            { id: 'badges', label: '🏆 徽章' },
            { id: 'settings', label: '设置' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-[#00D395] border-[#00D395]'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        {activeTab === 'profile' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">个人资料</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">昵称</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#00D395]"
                    placeholder="输入昵称"
                  />
                ) : (
                  <p className="text-white">{user.nickname}</p>
                )}
              </div>

              {isEditing && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">头像 URL</label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#00D395]"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-sm mb-2">登录方式</label>
                <p className="text-white">{getLoginMethodName()}</p>
              </div>

              {user.email && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">邮箱</label>
                  <p className="text-white">{user.email}</p>
                </div>
              )}

              {user.wallet_address && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">钱包地址</label>
                  <p className="text-white font-mono text-sm break-all">{user.wallet_address}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                  {success}
                </div>
              )}

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-2 bg-[#00D395] text-black rounded-lg font-medium hover:bg-[#00B380] transition disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setNickname(user.nickname || '');
                      setAvatar(user.avatar || '');
                      setError('');
                    }}
                    className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">我的收藏 ({favorites.length})</h2>
            
            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">还没有收藏过内容</p>
                <button
                  onClick={() => router.push('/insights')}
                  className="px-6 py-2 bg-[#00D395] text-black rounded-lg font-medium hover:bg-[#00B380] transition"
                >
                  浏览洞见
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="p-4 bg-black/30 rounded-lg border border-white/5 hover:border-pink-500/30 transition cursor-pointer"
                    onClick={() => router.push(`/insights/${fav.content_id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-pink-400 text-xl">❤️</span>
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">
                          {fav.content?.core_idea || '洞见详情'}
                        </p>
                        {fav.content?.content_zh && (
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {fav.content.content_zh.slice(0, 100)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
                      <span>收藏于 {new Date(fav.created_at).toLocaleDateString('zh-CN')}</span>
                      <span className="text-[#00D395]">查看详情 →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">我的评论 ({comments.length})</h2>
            
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">还没有发表过评论</p>
                <button
                  onClick={() => router.push('/insights')}
                  className="px-6 py-2 bg-[#00D395] text-black rounded-lg font-medium hover:bg-[#00B380] transition"
                >
                  浏览洞见
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 bg-black/30 rounded-lg border border-white/5"
                  >
                    <p className="text-white mb-2">{comment.content}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{new Date(comment.created_at).toLocaleDateString('zh-CN')}</span>
                      {comment.content_id && (
                        <button
                          onClick={() => router.push(`/insights/${comment.content_id}`)}
                          className="text-[#00D395] hover:underline"
                        >
                          查看原文 →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <ViewHistory />
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <UserBadges />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">账号设置</h2>
            
            <div className="space-y-6">
              {/* 账号关联 */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">账号关联</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔵</span>
                      <span className="text-white">Google</span>
                    </div>
                    {user.google_id ? (
                      <span className="text-green-500 text-sm">已关联</span>
                    ) : (
                      <button className="px-3 py-1 bg-white/10 text-white rounded text-sm hover:bg-white/20 transition">
                        关联
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">𝕏</span>
                      <span className="text-white">Twitter</span>
                    </div>
                    {user.twitter_id ? (
                      <span className="text-green-500 text-sm">已关联 {user.twitter_handle}</span>
                    ) : (
                      <button className="px-3 py-1 bg-white/10 text-white rounded text-sm hover:bg-white/20 transition">
                        关联
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔗</span>
                      <span className="text-white">Web3 钱包</span>
                    </div>
                    {user.wallet_address ? (
                      <span className="text-green-500 text-sm">
                        已关联 {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                      </span>
                    ) : (
                      <button className="px-3 py-1 bg-white/10 text-white rounded text-sm hover:bg-white/20 transition">
                        关联
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 危险操作 */}
              <div className="pt-6 border-t border-white/10">
                <h3 className="text-lg font-medium text-red-400 mb-4">危险区域</h3>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
