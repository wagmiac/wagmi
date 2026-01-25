'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import LoginModal from './LoginModal';

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (loading) {
    return <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="px-4 py-2 bg-[#FF8C00] text-black font-semibold rounded-full text-sm hover:bg-[#FFAD33] transition"
        >
          登录
        </button>
        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      </>
    );
  }

  // 显示登录方式图标
  const getLoginIcon = () => {
    if (user.google_id) return '🔵';
    if (user.twitter_id) return '𝕏';
    if (user.wallet_address) {
      if (user.chain_type === 'solana') return '👻';
      return '🦊';
    }
    return '👤';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-full hover:bg-white/10 transition"
      >
        {user.avatar ? (
          <Image src={user.avatar} alt="" width={24} height={24} className="w-6 h-6 rounded-full" />
        ) : (
          <span className="text-lg">{getLoginIcon()}</span>
        )}
        <span className="text-sm text-gray-300 max-w-[100px] truncate">
          {user.nickname || 'User'}
        </span>
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-sm text-white font-medium truncate">{user.nickname}</p>
              <p className="text-xs text-gray-500 truncate">
                {user.email || user.twitter_handle || user.wallet_address?.slice(0, 10) + '...'}
              </p>
            </div>
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setShowMenu(false)}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition"
              >
                👤 个人中心
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={() => setShowMenu(false)}
                  className="block px-4 py-2 text-sm text-yellow-500 hover:bg-white/5 transition"
                >
                  ⚙️ 管理后台
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5 transition"
              >
                🚪 退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
