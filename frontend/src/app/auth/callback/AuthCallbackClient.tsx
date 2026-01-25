'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokenDirectly } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const authToken = searchParams.get('auth_token');
      const authError = searchParams.get('auth_error');
      const authProvider = searchParams.get('auth_provider');

      if (authError) {
        setError(decodeURIComponent(authError));
        setProcessing(false);
        return;
      }

      if (authToken) {
        try {
          await setTokenDirectly(authToken);
          console.log(`OAuth login success via ${authProvider}`);
          // 重定向到首页
          router.push('/');
        } catch (err) {
          setError('Failed to process login');
          setProcessing(false);
        }
      } else {
        setError('No authentication token received');
        setProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, setTokenDirectly, router]);

  if (processing && !error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00D395] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-2">正在登录...</h1>
          <p className="text-gray-400">请稍候</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">登录失败</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#00D395] text-black rounded-lg font-medium hover:bg-[#00B380] transition"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return null;
}
