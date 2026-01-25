'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import AdminGuard from '@/components/AdminGuard';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface Stats {
  total_contents: number;
  pending_contents: number;
  published_contents: number;
  rejected_contents: number;
  total_users: number;
  total_comments: number;
  search_configs: number;
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const menuItems = [
    {
      href: '/admin/tokens',
      icon: '🪙',
      title: '代币管理',
      description: '创建、编辑和发布代币',
      stat: '管理代币',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      href: '/admin/content-review',
      icon: '📝',
      title: '内容审核',
      description: '审核和管理创业洞察内容',
      stat: stats ? `${stats.pending_contents} 待审核` : '-',
      color: 'from-orange-500 to-red-500',
    },
    {
      href: '/admin/search-config',
      icon: '🔍',
      title: '搜索配置',
      description: '管理自动搜索任务',
      stat: stats ? `${stats.search_configs} 个配置` : '-',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      href: '/insights',
      icon: '💡',
      title: '洞察列表',
      description: '查看已发布的内容',
      stat: stats ? `${stats.published_contents} 已发布` : '-',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const statCards = [
    { label: '总内容', value: stats?.total_contents || 0, icon: '📊' },
    { label: '待审核', value: stats?.pending_contents || 0, icon: '⏳', highlight: true },
    { label: '已发布', value: stats?.published_contents || 0, icon: '✅' },
    { label: '已拒绝', value: stats?.rejected_contents || 0, icon: '❌' },
    { label: '用户数', value: stats?.total_users || 0, icon: '👥' },
    { label: '评论数', value: stats?.total_comments || 0, icon: '💬' },
  ];

  return (
    <AdminGuard>
      <Navigation />
      <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          {/* 头部 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">🎛️ 管理后台</h1>
            <p className="text-gray-400">WAGMI 内容引擎管理中心</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {statCards.map((card, idx) => (
              <div
                key={idx}
                className={`bg-[#1a1a1a] border rounded-xl p-4 ${
                  card.highlight ? 'border-[#FF8C00]' : 'border-white/10'
                }`}
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className={`text-2xl font-bold ${card.highlight ? 'text-[#FF8C00]' : 'text-white'}`}>
                  {loading ? '-' : card.value}
                </div>
                <div className="text-sm text-gray-500">{card.label}</div>
              </div>
            ))}
          </div>

          {/* 功能入口 */}
          <div className="grid md:grid-cols-3 gap-6">
            {menuItems.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className="group bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl mb-4`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#FF8C00] transition">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                <div className="text-sm text-[#FF8C00]">{item.stat}</div>
              </Link>
            ))}
          </div>

          {/* 快捷操作 */}
          <div className="mt-8 bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">⚡ 快捷操作</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/admin/tokens/create"
                className="px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition font-medium"
              >
                ✨ 创建代币
              </Link>
              <Link
                href="/admin/content-review?tab=pending"
                className="px-4 py-2 bg-[#FF8C00]/10 text-[#FF8C00] rounded-lg hover:bg-[#FF8C00]/20 transition"
              >
                审核待发布内容
              </Link>
              <Link
                href="/admin/search-config"
                className="px-4 py-2 bg-[#00E5FF]/10 text-[#00E5FF] rounded-lg hover:bg-[#00E5FF]/20 transition"
              >
                添加搜索配置
              </Link>
              <Link
                href="/insights"
                className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition"
              >
                查看洞察列表
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </AdminGuard>
  );
}
