'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface FavoriteButtonProps {
  contentId: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

export default function FavoriteButton({ contentId, size = 'md', showCount = true }: FavoriteButtonProps) {
  const { user, token, openLogin } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      // 获取收藏数
      const countRes = await fetch(`${API_BASE}/favorites/count/${contentId}`);
      const countData = await countRes.json();
      if (countData.success) {
        setCount(countData.data.count);
      }

      // 检查是否已收藏
      if (token) {
        const checkRes = await fetch(`${API_BASE}/favorites/check/${contentId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const checkData = await checkRes.json();
        if (checkData.success) {
          setIsFavorited(checkData.data.favorited);
        }
      }
    } catch (err) {
      console.error('Failed to fetch favorite status:', err);
    }
  }, [contentId, token]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleToggle = async () => {
    if (!user) {
      openLogin();
      return;
    }

    setLoading(true);
    try {
      if (isFavorited) {
        // 取消收藏
        const res = await fetch(`${API_BASE}/favorites/${contentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setIsFavorited(false);
          setCount(c => Math.max(0, c - 1));
        }
      } else {
        // 添加收藏
        const res = await fetch(`${API_BASE}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ content_id: contentId }),
        });
        const data = await res.json();
        if (data.success) {
          setIsFavorited(true);
          setCount(c => c + 1);
        }
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-3',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-lg transition ${sizeClasses[size]} ${
        isFavorited
          ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30'
          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
      } disabled:opacity-50`}
      title={isFavorited ? '取消收藏' : '收藏'}
    >
      <span>{isFavorited ? '❤️' : '🤍'}</span>
      {showCount && <span>{count}</span>}
    </button>
  );
}
