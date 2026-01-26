"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();
  const pathname = usePathname();

  // 判断是否为当前页面
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/waggy.png" alt="Waggy" width={40} height={40} className="rounded-full" />
          <span className="text-2xl font-bold gradient-text">WAGMI</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/tokens" className={`${isActive('/tokens') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`}>{t("nav.tokens")}</Link>
          <Link href="/insights" className={`${isActive('/insights') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`}>{t("nav.insights")}</Link>
          <Link href="/idea-evaluator" className={`${isActive('/idea-evaluator') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`}>{t("nav.ideaEvaluator")}</Link>
          <Link href="/ph-evaluator" className={`${isActive('/ph-evaluator') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`}>{t("nav.phEvaluator")}</Link>
          <Link href="/ai-mentor" className={`${isActive('/ai-mentor') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`}>{t("nav.aiMentor")}</Link>
          <Link href="/faq" className={`${isActive('/faq') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`}>{t("nav.faq")}</Link>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <NotificationBell />
          <UserMenu />
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 border-t border-white/10 px-6 py-4 space-y-4">
          <Link href="/tokens" className={`block ${isActive('/tokens') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`} onClick={() => setMobileMenuOpen(false)}>{t("nav.tokens")}</Link>
          <Link href="/insights" className={`block ${isActive('/insights') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`} onClick={() => setMobileMenuOpen(false)}>{t("nav.insights")}</Link>
          <Link href="/idea-evaluator" className={`block ${isActive('/idea-evaluator') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`} onClick={() => setMobileMenuOpen(false)}>{t("nav.ideaEvaluator")}</Link>
          <Link href="/ph-evaluator" className={`block ${isActive('/ph-evaluator') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`} onClick={() => setMobileMenuOpen(false)}>{t("nav.phEvaluator")}</Link>
          <Link href="/ai-mentor" className={`block ${isActive('/ai-mentor') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`} onClick={() => setMobileMenuOpen(false)}>{t("nav.aiMentor")}</Link>
          <Link href="/faq" className={`block ${isActive('/faq') ? 'text-[#FF8C00]' : 'text-white'} hover:text-[#FF8C00] transition`} onClick={() => setMobileMenuOpen(false)}>{t("nav.faq")}</Link>
          <hr className="border-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">{t("nav.language")}:</span>
            <LanguageSwitcher />
          </div>
          <div className="pt-2">
            <UserMenu />
          </div>
        </div>
      )}
    </nav>
  );
}
