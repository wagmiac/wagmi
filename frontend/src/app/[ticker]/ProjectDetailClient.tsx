"use client";

import Image from "next/image";
import Link from "next/link";
import { Project, CHAIN_CONFIG } from "@/types/imo";
import { getMockTimelineEvents } from "@/lib/mock-timeline";
import {
  Sidebar,
  ChainIcon,
  StatusBadge,
  VerificationBadges,
  ProjectTimeline,
  useSidebar,
} from "@/components/imo";
import RevenueFlow from "@/components/imo/RevenueFlow";

interface ProjectDetailClientProps {
  project: Project;
}

export default function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const timelineEvents = getMockTimelineEvents(project.id);
  const { sidebarWidth } = useSidebar();
  const chainConfig = CHAIN_CONFIG[project.chain];

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回
              </Link>
              <div className="h-6 w-px bg-white/10" />
              <span className="text-[#FF8C00] font-mono font-bold">{project.ticker}</span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-4">
              <StatusBadge status={project.status} size="md" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Project Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Header */}
              <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="relative w-20 h-20 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                    {project.logo ? (
                      <Image
                        src={project.logo}
                        alt={project.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-500">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                      <ChainIcon chain={project.chain} size="md" showName />
                    </div>
                    <p className="text-[#FF8C00] font-mono text-lg mb-3">{project.ticker}</p>
                    <VerificationBadges verification={project.verification} size="lg" />
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 mt-4 leading-relaxed">
                  {project.description}
                </p>

                {/* Links */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
                  {project.website && (
                    <a
                      href={project.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-400 hover:text-[#00E5FF] transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      官网
                    </a>
                  )}
                  {project.twitter && (
                    <a
                      href={project.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-400 hover:text-[#00E5FF] transition"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Twitter
                    </a>
                  )}
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-400 hover:text-[#00E5FF] transition"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </a>
                  )}
                </div>
              </div>

              {/* Token Info (if launched) */}
              {project.status === "launched" && project.tokenAddress && (
                <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4">代币信息</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">合约地址</p>
                      <p className="text-sm font-mono text-[#00E5FF] break-all">
                        {project.tokenAddress}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">发射平台</p>
                      <p className="text-sm text-white">{project.launchpad}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">发射时间</p>
                      <p className="text-sm text-white">
                        {project.launchedAt
                          ? new Date(project.launchedAt).toLocaleString("zh-CN")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">伯乐首单</p>
                      <p className="text-sm font-bold text-[#10B981]">
                        ${project.firstBuyAmount || 0}
                      </p>
                    </div>
                  </div>
                  
                  {/* Trade Button */}
                  <a
                    href={`https://${project.launchpad}/${project.tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full px-4 py-3 bg-[#10B981] text-white font-bold rounded-lg hover:bg-[#059669] transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    前往交易
                  </a>
                </div>
              )}

              {/* Scout Info */}
              <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">发掘信息</h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF8C00]/20 flex items-center justify-center">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">伯乐</p>
                    <p className="font-mono text-white">{project.scoutWallet}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-gray-400">发掘时间</p>
                    <p className="text-white">
                      {new Date(project.discoveredAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Timeline & Revenue */}
            <div className="space-y-6">
              {/* Timeline */}
              <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                <h3 className="font-bold text-white mb-4">项目旅程</h3>
                <ProjectTimeline events={timelineEvents} status={project.status} />
              </div>

              {/* Revenue Flow - 只对已发射/已认领项目显示 */}
              {(project.status === "launched" || project.status === "claimed") && (
                <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-4">资金流向</h3>
                  <RevenueFlow project={project} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
