'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, isAdmin } from '@/lib/auth-context';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading, openLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      openLogin();
      return;
    }

    if (!isAdmin(user)) {
      router.push('/');
    }
  }, [user, loading, router, openLogin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!user || !isAdmin(user)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">需要管理员权限</p>
          <button
            onClick={() => router.push('/')}
            className="text-[#FF8C00] hover:underline"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
