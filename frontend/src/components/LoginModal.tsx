'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, setTokenDirectly } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

  // 处理 OAuth 回调（从 URL 参数中获取 token）
  const handleOAuthCallback = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('auth_token');
    const authError = params.get('auth_error');
    const authProvider = params.get('auth_provider');
    
    if (authError) {
      setError(`OAuth 错误: ${authError}`);
      // 清理 URL 参数
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    
    if (authToken) {
      // 直接设置 token
      setTokenDirectly(authToken);
      // 清理 URL 参数
      window.history.replaceState({}, '', window.location.pathname);
      console.log(`OAuth login success via ${authProvider}`);
      onClose();
    }
  }, [setTokenDirectly, onClose]);

  useEffect(() => {
    handleOAuthCallback();
  }, [handleOAuthCallback]);

  if (!isOpen) return null;

  // Google OAuth 登录
  const handleGoogleLogin = async () => {
    setLoading('google');
    setError('');
    
    try {
      // 获取 OAuth URL
      const res = await fetch(`${API_BASE}/auth/google/url`);
      const data = await res.json();
      
      if (!data.success) {
        // 如果 OAuth 未配置，使用模拟登录
        if (data.error === 'Google OAuth not configured') {
          await login('google', {
            google_id: 'google_' + Date.now(),
            email: 'user@gmail.com',
            name: 'Google User',
            avatar: '',
          });
          onClose();
          return;
        }
        throw new Error(data.error);
      }
      
      // 重定向到 Google OAuth
      window.location.href = data.data.url;
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Login failed');
      setLoading(null);
    }
  };

  // Twitter OAuth 登录
  const handleTwitterLogin = async () => {
    setLoading('twitter');
    setError('');
    
    try {
      // 获取 OAuth URL
      const res = await fetch(`${API_BASE}/auth/twitter/url`);
      const data = await res.json();
      
      if (!data.success) {
        // 如果 OAuth 未配置，使用模拟登录
        if (data.error === 'Twitter OAuth not configured') {
          await login('twitter', {
            twitter_id: 'twitter_' + Date.now(),
            handle: '@wagmi_user',
            name: 'Twitter User',
            avatar: '',
          });
          onClose();
          return;
        }
        throw new Error(data.error);
      }
      
      // 存储 code_verifier（用于 PKCE）
      if (data.data.code_verifier) {
        document.cookie = `twitter_code_verifier=${data.data.code_verifier}; path=/; max-age=600; SameSite=Lax`;
      }
      
      // 重定向到 Twitter OAuth
      window.location.href = data.data.url;
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Login failed');
      setLoading(null);
    }
  };

  // 钱包登录 - 真实签名流程
  const handleWalletLogin = async (walletType: string, chainType: string) => {
    setLoading(walletType);
    setError('');

    try {
      let address = '';
      let provider: unknown = null;
      
      // 获取钱包地址
      if (chainType === 'evm') {
        // EVM 钱包 (MetaMask, OKX, WalletConnect, Coinbase)
        const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string[]>; isOKExWallet?: boolean; isCoinbaseWallet?: boolean } }).ethereum;
        if (!ethereum) {
          throw new Error('请先安装 MetaMask 或其他 EVM 钱包');
        }
        provider = ethereum;
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        address = accounts[0];
      } else if (chainType === 'solana') {
        // Solana 钱包 (Phantom)
        const solana = (window as Window & { solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toString: () => string } }>; signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }> } }).solana;
        if (!solana?.isPhantom) {
          throw new Error('请先安装 Phantom 钱包');
        }
        provider = solana;
        const resp = await solana.connect();
        address = resp.publicKey.toString();
      } else {
        throw new Error('不支持的链类型');
      }

      if (!address) {
        throw new Error('获取钱包地址失败');
      }

      // 获取 nonce 和签名消息
      const nonceRes = await fetch(`${API_BASE}/auth/nonce?address=${address}`);
      const nonceData = await nonceRes.json();
      if (!nonceData.success) {
        throw new Error(nonceData.error || '获取 nonce 失败');
      }
      const { message } = nonceData.data;

      // 请求签名
      let signature = '';
      if (chainType === 'evm') {
        const ethereum = provider as { request: (args: { method: string; params?: unknown[] }) => Promise<string> };
        signature = await ethereum.request({
          method: 'personal_sign',
          params: [message, address],
        });
      } else if (chainType === 'solana') {
        const solana = provider as { signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }> };
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await solana.signMessage(encodedMessage, 'utf8');
        signature = Buffer.from(signedMessage.signature).toString('hex');
      }

      // 登录
      await login('wallet', {
        address,
        signature,
        message,
        wallet_type: walletType,
        chain_type: chainType,
      });
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || '钱包连接失败');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">登录 WAGMI</h2>
        <p className="text-gray-400 text-sm mb-6 text-center">
          选择登录方式参与讨论
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 社交登录 */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading === 'google' ? '连接中...' : 'Google 登录'}
          </button>

          <button
            onClick={handleTwitterLogin}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white border border-white/20 rounded-lg font-medium hover:bg-white/5 transition disabled:opacity-50"
          >
            <span className="text-xl">𝕏</span>
            {loading === 'twitter' ? '连接中...' : 'X (Twitter) 登录'}
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#1a1a1a] text-gray-500">或使用钱包</span>
          </div>
        </div>

        {/* Web3 钱包 */}
        <div className="space-y-3">
          {/* EVM 钱包 */}
          <div className="text-xs text-gray-500 mb-2">EVM 链 (Ethereum, BSC, Polygon...)</div>
          
          <button
            onClick={() => handleWalletLogin('metamask', 'evm')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#F6851B]/10 border border-[#F6851B]/30 text-white rounded-lg font-medium hover:bg-[#F6851B]/20 transition disabled:opacity-50"
          >
            🦊 {loading === 'metamask' ? '连接中...' : 'MetaMask'}
          </button>

          <button
            onClick={() => handleWalletLogin('okx', 'evm')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition disabled:opacity-50"
          >
            ⬡ {loading === 'okx' ? '连接中...' : 'OKX Wallet'}
          </button>

          <button
            onClick={() => handleWalletLogin('walletconnect', 'evm')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#3B99FC]/10 border border-[#3B99FC]/30 text-white rounded-lg font-medium hover:bg-[#3B99FC]/20 transition disabled:opacity-50"
          >
            🔗 {loading === 'walletconnect' ? '连接中...' : 'WalletConnect'}
          </button>

          <button
            onClick={() => handleWalletLogin('coinbase', 'evm')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0052FF]/10 border border-[#0052FF]/30 text-white rounded-lg font-medium hover:bg-[#0052FF]/20 transition disabled:opacity-50"
          >
            💙 {loading === 'coinbase' ? '连接中...' : 'Coinbase Wallet'}
          </button>

          {/* Solana 钱包 */}
          <div className="text-xs text-gray-500 mt-4 mb-2">Solana 链</div>

          <button
            onClick={() => handleWalletLogin('phantom', 'solana')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#AB9FF2]/10 border border-[#AB9FF2]/30 text-white rounded-lg font-medium hover:bg-[#AB9FF2]/20 transition disabled:opacity-50"
          >
            👻 {loading === 'phantom' ? '连接中...' : 'Phantom'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          登录即表示同意 WAGMI 的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
