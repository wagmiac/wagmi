'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { InsightContent } from '@/lib/content-api';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface ViewHistoryItem {
  id: string;
  content_id: string;
  viewed_at: string;
  content: InsightContent;
}

export default function ViewHistory() {
  const { user, token } = useAuth();
  const [history, setHistory] = useState<ViewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    if (!token) return;
    
    try {
      await fetch(`${API_BASE}/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setHistory(history.filter(h => h.id !== id));
    } catch (err) {
      console.error('Failed to delete history:', err);
    }
  };

  const handleClearAll = async () => {
    if (!token || !confirm('确定清空所有浏览记录？')) return;

    try {
      await fetch(`${API_BASE}/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-gray-400">登录后查看浏览历史</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-white/10 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📖</div>
        <p className="text-gray-400">暂无浏览记录</p>
        <Link href="/insights" className="text-[#FF8C00] hover:underline mt-2 inline-block">
          去探索洞察 →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">浏览历史</h2>
        <button
          onClick={handleClearAll}
          className="text-sm text-gray-500 hover:text-red-400 transition"
        >
          清空全部
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-white/20 transition"
          >
            <Link href={`/insights/${item.content_id}`} className="flex-1 group">
              <h3 className="text-[#FF8C00] font-medium group-hover:text-[#FFAD33] transition mb-1">
                💡 {item.content?.core_idea || '创业洞察'}
              </h3>
              <p className="text-gray-400 text-sm line-clamp-1">
                {item.content?.content_zh?.slice(0, 100) || item.content?.raw_content?.slice(0, 100)}
              </p>
              <span className="text-gray-500 text-xs mt-2 block">
                {formatTime(item.viewed_at)}
              </span>
            </Link>
            <button
              onClick={() => handleDelete(item.id)}
              className="text-gray-500 hover:text-red-400 transition p-1"
              title="删除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
