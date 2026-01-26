"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";
import { useSidebar, SIDEBAR_WIDTH } from "./SidebarContext";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "IMO",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: "/my",
    label: "我的",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: "/help",
    label: "帮助",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed, sidebarWidth } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/$");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className="fixed left-0 top-0 h-full bg-[#0a0a0a] border-r border-white/10 flex-col z-50 transition-all duration-300 hidden md:flex"
        style={{ width: sidebarWidth }}
      >
      {/* Logo */}
      <div className={`border-b border-white/10 ${isCollapsed ? 'p-2' : 'p-4 px-6'}`}>
        <Link href="/" className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <Image 
            src="/waggy.png" 
            alt="Waggy" 
            width={40} 
            height={40} 
            className="rounded-full flex-shrink-0"
          />
          {!isCollapsed && (
            <span className="text-xl font-bold gradient-text whitespace-nowrap">WAGMI</span>
          )}
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 py-3 rounded-lg transition-all ${
                  isCollapsed ? 'justify-center px-2' : 'px-4'
                } ${
                  isActive(item.href)
                    ? "bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00]/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Collapse Toggle Button */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-white/10`}>
        <button
          onClick={toggleCollapsed}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all ${isCollapsed ? 'px-2' : 'px-4'}`}
          title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          <svg 
            className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!isCollapsed && (
            <span className="text-sm whitespace-nowrap">收起</span>
          )}
        </button>
      </div>
      
      {/* Bottom Section - Connect Wallet */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-white/10`}>
        <WalletButton collapsed={isCollapsed} />
      </div>
    </aside>

    {/* Mobile Header */}
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-50 md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Image 
          src="/waggy.png" 
          alt="Waggy" 
          width={36} 
          height={36} 
          className="rounded-full"
        />
        <span className="text-lg font-bold gradient-text">WAGMI</span>
      </Link>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="p-2 text-gray-400 hover:text-white"
      >
        {mobileMenuOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
    </header>

    {/* Mobile Menu Overlay */}
    {mobileMenuOpen && (
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => setMobileMenuOpen(false)}
      />
    )}

    {/* Mobile Menu Drawer */}
    <div className={`fixed top-16 right-0 w-64 h-[calc(100vh-4rem)] bg-[#0a0a0a] border-l border-white/10 z-50 transform transition-transform duration-300 md:hidden ${
      mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.href)
                    ? "bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00]/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-white/10">
        <WalletButton collapsed={false} />
      </div>
    </div>

    {/* Mobile Bottom Navigation */}
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-around z-50 md:hidden safe-area-pb">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg ${
            isActive(item.href)
              ? "text-[#FF8C00]"
              : "text-gray-400"
          }`}
        >
          {item.icon}
          <span className="text-xs">{item.label}</span>
        </Link>
      ))}
      <Link
        href="/submit"
        className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-[#FF8C00]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-xs">发掘</span>
      </Link>
    </nav>
  </>
  );
}
