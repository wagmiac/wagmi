'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, startTransition } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface User {
  id: string;
  email?: string;
  google_id?: string;
  twitter_id?: string;
  twitter_handle?: string;
  wallet_address?: string;
  wallet_type?: string;
  chain_type?: string;
  nickname: string;
  avatar?: string;
  role?: string; // user/admin
}

// 检查是否管理员
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  login: (provider: 'google' | 'twitter' | 'wallet', data: Record<string, unknown>) => Promise<void>;
  setTokenDirectly: (token: string) => Promise<void>;
  logout: () => void;
  updateProfile: (nickname: string, avatar?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  // 从 localStorage 恢复登录状态
  useEffect(() => {
    const savedToken = localStorage.getItem('wagmi_token');
    const savedUser = localStorage.getItem('wagmi_user');
    
    startTransition(() => {
      if (savedToken && savedUser) {
        // 检查 token 是否过期
        try {
          const payload = JSON.parse(atob(savedToken.split('.')[1]));
          const exp = payload.exp * 1000; // 转换为毫秒
          if (Date.now() >= exp) {
            // Token 已过期，清除登录状态
            console.log('Token expired, logging out...');
            localStorage.removeItem('wagmi_token');
            localStorage.removeItem('wagmi_user');
          } else {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          }
        } catch {
          // 解析失败，清除登录状态
          localStorage.removeItem('wagmi_token');
          localStorage.removeItem('wagmi_user');
        }
      }
      setLoading(false);
    });
  }, []);

  // 登录
  const login = useCallback(async (provider: 'google' | 'twitter' | 'wallet', data: Record<string, unknown>) => {
    const endpoints: Record<string, string> = {
      google: '/auth/google',
      twitter: '/auth/twitter',
      wallet: '/auth/wallet',
    };

    const res = await fetch(`${API_BASE}${endpoints[provider]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Login failed');
    }

    const { token: newToken, user: newUser } = result.data;
    
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('wagmi_token', newToken);
    localStorage.setItem('wagmi_user', JSON.stringify(newUser));
  }, []);

  // 登出
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('wagmi_token');
    localStorage.removeItem('wagmi_user');
  }, []);

  // 直接设置 token（用于 OAuth 回调）
  const setTokenDirectly = useCallback(async (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('wagmi_token', newToken);
    
    // 获取用户信息
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${newToken}`,
        },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setUser(result.data);
        localStorage.setItem('wagmi_user', JSON.stringify(result.data));
      }
    } catch (error) {
      console.error('Failed to get user info:', error);
    }
  }, []);

  // 更新资料
  const updateProfile = useCallback(async (nickname: string, avatar?: string) => {
    if (!token) throw new Error('Not logged in');

    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ nickname, avatar }),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Update failed');
    }

    // 更新本地用户信息
    if (user) {
      const updatedUser = { ...user, nickname, avatar: avatar || user.avatar };
      setUser(updatedUser);
      localStorage.setItem('wagmi_user', JSON.stringify(updatedUser));
    }
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, isLoginOpen, openLogin, closeLogin, login, setTokenDirectly, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// API 请求辅助函数（自动处理 401 登出）
export function useAuthFetch() {
  const { token, logout } = useAuth();

  return useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url.startsWith('http') ? url : `${API_BASE}${url}`, {
      ...options,
      headers,
    });

    // 401 表示 token 无效或过期，自动登出
    if (res.status === 401) {
      console.log('Received 401, token expired or invalid, logging out...');
      logout();
      // 可以选择跳转到登录页或显示登录弹窗
      throw new Error('登录已过期，请重新登录');
    }

    return res.json();
  }, [token, logout]);
}
