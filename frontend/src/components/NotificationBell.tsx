'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // 调试：打印 user 状态
  useEffect(() => {
    console.log('NotificationBell mounted, user:', user, 'token:', token ? 'exists' : 'null');
  }, [user, token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/notifications/unread`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        // API 不可用，静默失败
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.data.count);
      }
    } catch (err) {
      // API 不可用或网络错误，静默失败
      console.debug('Notification API not available:', err);
    }
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        // API 不可用，静默失败
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (err) {
      // API 不可用或网络错误，静默失败
      console.debug('Notification API not available:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUnreadCount();
    // 每分钟刷新一次未读数
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleOpenDropdown = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/read/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment_reply': return '💬';
      case 'new_favorite': return '❤️';
      case 'system': return '⚙️';
      case 'broadcast': return '📢';
      default: return '🔔';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (!user) {
    console.debug('NotificationBell: User not logged in, hiding bell');
    return null;
  }

  console.debug('NotificationBell: Rendering bell for user', user.nickname, 'unreadCount:', unreadCount);

  return (
    <div className="relative">
      <button
        onClick={handleOpenDropdown}
        className="relative p-2 text-gray-400 hover:text-white transition"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-medium">通知</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#00D395] hover:underline"
                >
                  全部已读
                </button>
              )}
            </div>

            {/* 通知列表 */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#00D395] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无通知
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-white/5 hover:bg-white/5 transition ${
                      !notification.read ? 'bg-[#00D395]/5' : ''
                    }`}
                  >
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => {
                          handleMarkRead(notification.id);
                          setShowDropdown(false);
                        }}
                        className="block"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{getIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{notification.title}</p>
                            <p className="text-gray-400 text-xs mt-1 truncate">{notification.message}</p>
                            <p className="text-gray-500 text-xs mt-1">{formatTime(notification.created_at)}</p>
                          </div>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-[#00D395] rounded-full"></span>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div 
                        className="flex items-start gap-3 cursor-pointer"
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        <span className="text-xl">{getIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{notification.title}</p>
                          <p className="text-gray-400 text-xs mt-1">{notification.message}</p>
                          <p className="text-gray-500 text-xs mt-1">{formatTime(notification.created_at)}</p>
                        </div>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-[#00D395] rounded-full"></span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 底部 */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-white/10 text-center">
                <Link
                  href="/profile?tab=notifications"
                  onClick={() => setShowDropdown(false)}
                  className="text-sm text-[#00D395] hover:underline"
                >
                  查看全部通知
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
