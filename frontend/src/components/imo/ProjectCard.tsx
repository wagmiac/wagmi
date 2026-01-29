"use client";

import Link from "next/link";
import Image from "next/image";
import { Project, EvaluationGrade, Launchpad, LAUNCHPAD_CONFIG } from "@/types/imo";

interface ProjectCardProps {
  project: Project;
}

// 所有发射台（与 TokenList 保持一致，暂时隐藏 trends.fun）
const ALL_LAUNCHPADS: Launchpad[] = ['pump.fun', 'bags.fm', 'four.meme', 'flap.sh'];

// 发射台 Logo
const LAUNCHPAD_LOGOS: Record<Launchpad, string> = {
  'pump.fun': '/pumpfun.webp',
  'trends.fun': '/trends-logo.png',
  'bags.fm': '/bagsfm.png',
  'four.meme': '/fourmeme.svg',
  'flap.sh': '/flapsh.webp',
};

// AI 评级颜色
const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  'S': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'A': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'B': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'C': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'D': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  'F': { bg: 'bg-red-500/20', text: 'text-red-400' },
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const {
    ticker,
    name,
    logo,
    description,
    launched_pads,
    github_stars,
    github_hot_level,
    github,
    twitter,
    telegram,
    discord,
    website,
    product_hunt,
    reddit,
    created_at,
    eval_overall_grade,  // 直接从项目读取评级缓存
  } = project;

  // 获取已发射的发射台列表
  const launchedPadsList = launched_pads || [];

  // 检查是否有任何社媒链接
  const hasSocialLinks = !!(website || twitter || telegram || discord || reddit || product_hunt);
  // 检查是否有 GitHub 信息（有链接或者有大于0的星星数）
  const hasGithubInfo = !!(github || (github_stars !== undefined && github_stars !== null && github_stars > 0));

  // 格式化 Stars 数量
  function formatStars(stars?: number): string {
    if (!stars || stars === 0) return '—';
    if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`;
    return stars.toString();
  }

  // 格式化时间
  function formatTimeAgo(dateStr?: string): string {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    return `${days}天前`;
  }

  return (
    <Link
      href={`/${ticker.replace('$', '')}`}
      className="relative block bg-[#111111] border border-white/10 rounded-xl p-4 hover:border-[#FF8C00]/50 hover:bg-[#1a1a1a] transition-all card-hover group"
    >
      {/* 右上角：AI 评级 */}
      {project.eval_overall_grade && (
        <div className="absolute top-3 right-3 z-10">
          <span className={`px-2 py-1 rounded-md text-sm font-bold shadow-lg ${GRADE_COLORS[project.eval_overall_grade]?.bg || 'bg-gray-600'} ${GRADE_COLORS[project.eval_overall_grade]?.text || 'text-white'} border ${
            project.eval_overall_grade === 'S' ? 'border-purple-400/50' :
            project.eval_overall_grade === 'A' ? 'border-green-400/50' :
            project.eval_overall_grade === 'B' ? 'border-blue-400/50' :
            project.eval_overall_grade === 'C' ? 'border-yellow-400/50' :
            'border-orange-400/50'
          }`}>
            {project.eval_overall_grade}
          </span>
        </div>
      )}

      {/* Header: Logo + Name + Ticker */}
      <div className="flex items-start gap-3 mb-2">
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
        <div className="flex-1 min-w-0 pr-12">
          <h3 className="font-bold text-white truncate group-hover:text-[#FF8C00] transition">
            {name}
          </h3>
          <p className="text-[#FF8C00] font-mono text-sm">{ticker}</p>
        </div>
      </div>

      {/* 简介 */}
      {description && (
        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{description}</p>
      )}
      
      {/* 中部：发射台 Logo 状态 */}
      <div className="flex items-center justify-center gap-3 mb-3 py-2 px-3 bg-white/5 rounded-lg">
        {ALL_LAUNCHPADS.map(pad => {
          const isLaunched = launchedPadsList.includes(pad);
          const chain = LAUNCHPAD_CONFIG[pad]?.chain;
          return (
            <div
              key={pad}
              className={`relative w-6 h-6 rounded transition-all ${
                isLaunched 
                  ? 'opacity-100' 
                  : 'opacity-30 grayscale'
              }`}
              title={`${pad} (${chain === 'solana' ? 'Solana' : 'BSC'}): ${isLaunched ? '已发射' : '未发射'}`}
            >
              <Image
                src={LAUNCHPAD_LOGOS[pad]}
                alt={pad}
                fill
                className="object-contain"
              />
            </div>
          );
        })}
      </div>
      
      {/* 底部：社媒链接 + GitHub Stars + 创建时间 */}
      <div className="border-t border-white/5 pt-3">
        <div className="flex items-center justify-between">
          {/* 左侧：社媒链接 + GitHub信息 */}
          <div className="flex items-center gap-3">
            {/* 社媒链接组 - 只有有链接时才显示 */}
            {hasSocialLinks && (
              <div className="flex items-center gap-2">
                {website && (
                  <span 
                    onClick={(e) => { e.preventDefault(); window.open(website, '_blank'); }}
                    className="text-gray-400 hover:text-white transition cursor-pointer"
                    title="Website"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </span>
                )}
                {twitter && (
                  <span 
                    onClick={(e) => { e.preventDefault(); window.open(twitter, '_blank'); }}
                    className="text-gray-400 hover:text-white transition cursor-pointer"
                    title="Twitter/X"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </span>
                )}
                {telegram && (
                  <span 
                    onClick={(e) => { e.preventDefault(); window.open(telegram, '_blank'); }}
                    className="text-gray-400 hover:text-white transition cursor-pointer"
                    title="Telegram"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </span>
                )}
                {discord && (
                  <span 
                    onClick={(e) => { e.preventDefault(); window.open(discord, '_blank'); }}
                    className="text-gray-400 hover:text-white transition cursor-pointer"
                    title="Discord"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                    </svg>
                  </span>
                )}
                {reddit && (
                  <span 
                    onClick={(e) => { e.preventDefault(); window.open(reddit, '_blank'); }}
                    className="text-gray-400 hover:text-white transition cursor-pointer"
                    title="Reddit"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                    </svg>
                  </span>
                )}
                {product_hunt && (
                  <span 
                    onClick={(e) => { e.preventDefault(); window.open(product_hunt, '_blank'); }}
                    className="text-gray-400 hover:text-white transition cursor-pointer"
                    title="Product Hunt"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.604 8.4h-3.405V12h3.405c.995 0 1.801-.806 1.801-1.801 0-.993-.805-1.799-1.801-1.799zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804c2.319 0 4.2 1.88 4.2 4.199 0 2.321-1.881 4.201-4.201 4.201z" />
                    </svg>
                  </span>
                )}
              </div>
            )}
            
            {/* GitHub 信息组：图标 + 星星 + 爆 - 只有有信息时才显示 */}
            {hasGithubInfo && (
              <div className={`flex items-center gap-1.5 ${hasSocialLinks ? 'border-l border-white/10 pl-3' : ''}`}>
                {github && (
                  <span 
                    onClick={(e) => { e.preventDefault(); window.open(github, '_blank'); }}
                    className="text-gray-400 hover:text-white transition cursor-pointer"
                    title="GitHub"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </span>
                )}
                {github_stars !== undefined && github_stars !== null && github_stars > 0 && (
                  <span className="text-gray-300 text-xs font-medium">⭐{formatStars(github_stars)}</span>
                )}
                {github_hot_level && github_hot_level !== 'cold' && github_hot_level !== 'normal' && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    github_hot_level === 'explosive' ? 'bg-red-500/20 text-red-400' :
                    github_hot_level === 'hot' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {github_hot_level === 'explosive' ? '🔥爆' : 
                     github_hot_level === 'hot' ? '🔥热' : '温'}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* 右侧：创建时间 */}
          <div className="text-right flex-shrink-0">
            <span className="text-gray-500 text-xs">{formatTimeAgo(created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
