'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

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

  const quickActions = [
    {
      href: '/admin/tokens',
      icon: '🪙',
      title: '代币管理',
      description: '创建、编辑和发布代币',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      href: '/admin/promo',
      icon: '🎟️',
      title: '免单码管理',
      description: '创建和管理发掘费免单码',
      color: 'from-purple-500 to-pink-500',
    },
    {
      href: '/admin/content-review',
      icon: '📝',
      title: '内容审核',
      description: '审核和管理创业洞察内容',
      color: 'from-orange-500 to-red-500',
    },
    {
      href: '/admin/search-config',
      icon: '🔍',
      title: '搜索配置',
      description: '管理自动搜索任务',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      href: '/admin/settings',
      icon: '⚙️',
      title: '系统配置',
      description: 'GitHub、AI、支付等配置',
      color: 'from-gray-500 to-slate-500',
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
    <AdminLayout title="概览">
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

      {/* 快捷入口 */}
      <h2 className="text-lg font-semibold text-white mb-4">快捷入口</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className="group bg-[#1a1a1a] border border-white/10 rounded-xl p-5 hover:border-white/20 transition"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-xl mb-3`}>
              {item.icon}
            </div>
            <h3 className="text-base font-semibold text-white mb-1 group-hover:text-[#FF8C00] transition">
              {item.title}
            </h3>
            <p className="text-gray-500 text-sm">{item.description}</p>
          </Link>
        ))}
      </div>

      {/* 快捷操作按钮 */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">⚡ 快捷操作</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/tokens/create"
            className="px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition font-medium text-sm"
          >
            ✨ 创建代币
          </Link>
          <Link
            href="/admin/promo"
            className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition text-sm"
          >
            🎟️ 创建免单码
          </Link>
          <Link
            href="/admin/content-review?tab=pending"
            className="px-4 py-2 bg-[#FF8C00]/10 text-[#FF8C00] rounded-lg hover:bg-[#FF8C00]/20 transition text-sm"
          >
            审核待发布内容
          </Link>
          <Link
            href="/imo-admin"
            className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition text-sm"
          >
            🚀 IMO管理
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
