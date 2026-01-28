'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface SubscribeButtonProps {
  tag: string;
  size?: 'sm' | 'md';
}

export default function SubscribeButton({ tag, size = 'md' }: SubscribeButtonProps) {
  const { user, token } = useAuth();
  const toast = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/subscriptions/check/${encodeURIComponent(tag)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(data.data.subscribed);
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
    }
  }, [tag, token]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const handleToggle = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    setLoading(true);
    try {
      const method = subscribed ? 'DELETE' : 'POST';
      const res = await fetch(`${API_BASE}/subscriptions/${encodeURIComponent(tag)}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(!subscribed);
      }
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`${sizeClasses[size]} rounded-full font-medium transition ${
        subscribed
          ? 'bg-[#FF8C00] text-black hover:bg-[#FF8C00]/80'
          : 'bg-white/10 text-gray-300 hover:bg-white/20'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? '...' : subscribed ? '✓ 已订阅' : '+ 订阅'}
    </button>
  );
}
