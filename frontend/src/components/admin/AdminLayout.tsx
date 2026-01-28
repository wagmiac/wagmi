'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

interface MenuItem {
  href: string;
  icon: string;
  title: string;
}

const menuItems: MenuItem[] = [
  { href: '/admin', icon: '🏠', title: '概览' },
  { href: '/admin/tokens', icon: '🪙', title: '代币管理' },
  { href: '/admin/promo', icon: '🎟️', title: '免单码管理' },
  { href: '/admin/content-review', icon: '📝', title: '内容审核' },
  { href: '/admin/search-config', icon: '🔍', title: '搜索配置' },
  { href: '/admin/settings', icon: '⚙️', title: '系统配置' },
  { href: '/imo-admin', icon: '🚀', title: 'IMO管理' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#0a0a0a] flex">
        {/* 左侧菜单 */}
        <aside className="w-60 bg-[#111111] border-r border-white/10 fixed h-screen overflow-y-auto">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🎛️</span>
              <span className="text-lg font-bold text-white">管理后台</span>
            </Link>
          </div>

          {/* 菜单列表 */}
          <nav className="p-3">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition ${
                  isActive(item.href)
                    ? 'bg-[#FF8C00]/20 text-[#FF8C00]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.title}</span>
              </Link>
            ))}
          </nav>

          {/* 底部返回链接 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
            >
              <span>←</span>
              <span>返回首页</span>
            </Link>
          </div>
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 ml-60">
          {/* 顶部标题栏 */}
          {title && (
            <header className="h-16 bg-[#111111] border-b border-white/10 flex items-center px-6 sticky top-0 z-10">
              <h1 className="text-xl font-bold text-white">{title}</h1>
            </header>
          )}

          {/* 内容区 */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
