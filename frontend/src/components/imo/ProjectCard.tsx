"use client";

import Link from "next/link";
import Image from "next/image";
import { Project, CHAIN_CONFIG } from "@/types/imo";
import ChainIcon from "./ChainIcon";
import StatusBadge from "./StatusBadge";
import VerificationBadges from "./VerificationBadges";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const {
    ticker,
    name,
    logo,
    chain,
    status,
    firstBuyAmount,
    launchedAt,
    verification,
  } = project;

  const chainConfig = CHAIN_CONFIG[chain];

  // 根据链类型获取样式
  const chainStyles = {
    solana: {
      hoverBorder: 'hover:border-[#9945FF]/50',
      amountColor: 'text-sol',
    },
    bsc: {
      hoverBorder: 'hover:border-[#F0B90B]/50',
      amountColor: 'text-bnb',
    },
  };

  const style = chainStyles[chain] || chainStyles.solana;

  // 格式化时间
  function formatTimeAgo(dateStr?: string): string {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  }

  return (
    <Link
      href={`/${ticker.replace('$', '')}`}
      className={`block bg-[#111111] border border-white/10 rounded-xl p-4 ${style.hoverBorder} hover:bg-[#1a1a1a] transition-all card-hover group`}
    >
      {/* Header: Logo + Name + Chain */}
      <div className="flex items-start gap-3 mb-3">
        {/* Logo */}
        <div className="relative w-12 h-12 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
          {logo ? (
            <Image
              src={logo}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        {/* Name & Ticker */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate group-hover:text-[#FF8C00] transition">
            {name}
          </h3>
          <p className="text-[#FF8C00] font-mono text-sm">{ticker}</p>
        </div>
        
        {/* Chain Icon */}
        <ChainIcon chain={chain} size="sm" />
      </div>
      
      {/* Status & Verification */}
      <div className="flex items-center justify-between mb-3">
        <StatusBadge status={status} />
        <VerificationBadges verification={verification} size="sm" />
      </div>
      
      {/* Launch Info */}
      <div className="border-t border-white/5 pt-3">
        {status === 'launching' ? (
          <div className="text-center">
            <p className="text-[#00E5FF] font-bold animate-pulse">发射中...</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">伯乐首单</p>
              <p className={`font-bold ${style.amountColor}`}>
                {firstBuyAmount ? `${firstBuyAmount} ${chainConfig.currency}` : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">发射时间</p>
              <p className="text-white font-medium text-sm">{formatTimeAgo(launchedAt)}</p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
