"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Project, ProjectEvaluation } from "@/types/imo";
import {
  Sidebar,
  ChainIcon,
  StatusBadge,
  VerificationBadges,
  useSidebar,
  HeatStats,
  TokenList,
  ProjectDiscussion,
} from "@/components/imo";
import RevenueFlow from "@/components/imo/RevenueFlow";
import { useMultiWallet } from "@/lib/wallet/MultiWalletProvider";
import { EvaluationDetail, EvaluationLoading, EvaluationEmpty, EvaluationInProgress } from "@/components/imo/EvaluationDetail";
import { getIMOToken } from "@/lib/api/imo";

interface ProjectDetailClientProps {
  project: Project;
}

export default function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const { sidebarWidth } = useSidebar();
  const { wallets } = useMultiWallet();

  // 评估状态
  const [evaluation, setEvaluation] = useState<ProjectEvaluation | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(true);
  const [isReEvaluating, setIsReEvaluating] = useState(false);

  // 构建验证对象
  const verification = {
    twitter: project.verify_twitter || false,
    github: project.verify_github || false,
    website: project.verify_website || false,
    official: project.verify_official || false,
  };

  // 检查当前用户是否可以编辑（伯乐或创作者）
  const connectedWallets = wallets
    .filter((w) => w.address)
    .map((w) => w.address.toLowerCase());
  const scoutWallet = project.scout_wallet?.toLowerCase();
  const creatorWallet = project.creator_wallet?.toLowerCase();
  const canEdit = connectedWallets.some(
    (w) => w === scoutWallet || w === creatorWallet
  );
  
  // 检查是否可以重新评估（伯乐且有token）
  const token = typeof window !== 'undefined' ? getIMOToken() : null;
  const canReEvaluate = connectedWallets.some((w) => w === scoutWallet) && !!token;

  // 获取评估数据
  const fetchEvaluation = useCallback(async () => {
    try {
      setEvaluationLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const res = await fetch(`${API_URL}/imo/projects/${project.id}/evaluation`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setEvaluation(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch evaluation:', error);
    } finally {
      setEvaluationLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchEvaluation();
  }, [fetchEvaluation]);

  // 触发重新评估
  const handleReEvaluate = async () => {
    if (!token) return;
    
    try {
      setIsReEvaluating(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const res = await fetch(`${API_URL}/imo/projects/${project.id}/evaluate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setEvaluation(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to re-evaluate:', error);
    } finally {
      setIsReEvaluating(false);
    }
  };

  // 获取评分徽章样式
  const getGradeBadgeClass = (grade: string) => {
    if (grade === 'S' || grade === 'A') return 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30';
    if (grade === 'B') return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
    if (grade === 'C') return 'bg-orange-500/20 text-orange-500 border border-orange-500/30';
    return 'bg-red-500/20 text-red-500 border border-red-500/30';
  };

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
              {canEdit && (
                <Link
                  href={`/${project.ticker}/edit`}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑
                </Link>
              )}
              <StatusBadge status={project.status} size="md" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - 代币信息区 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 模块1: 项目标识 + AI 评分徽章 */}
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                      {/* 项目不再绑定公链，通过发射台插槽决定 */}
                      {/* <ChainIcon chain={project.chain} size="md" showName /> */}
                      {/* AI 评分徽章 */}
                      {evaluation && evaluation.overall_grade && (
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeBadgeClass(evaluation.overall_grade)}`}>
                          AI 评级: {evaluation.overall_grade}
                        </div>
                      )}
                    </div>
                    <p className="text-[#FF8C00] font-mono text-lg mb-3">{project.ticker}</p>
                    {/* 验证徽章暂时隐藏，等原作者点亮功能完善后再加回来 */}
                    {/* <VerificationBadges verification={verification} size="lg" /> */}
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 mt-4 leading-relaxed">
                  {project.description}
                </p>

                {/* 模块5: 媒体链接 + 模块6: 发掘者信息 */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  {/* Media Links */}
                  <div className="flex items-center gap-4 flex-wrap">
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
                    {project.telegram && (
                      <a
                        href={project.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-400 hover:text-[#0088CC] transition"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                        Telegram
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
                    {project.product_hunt && (
                      <a
                        href={project.product_hunt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-400 hover:text-[#DA552F] transition"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13.337 4H7v16h3.6v-5.6h2.737c3.195 0 5.663-2.468 5.663-5.2S16.532 4 13.337 4m-.063 7.2H10.6V7.2h2.674c1.222 0 2.126.904 2.126 2s-.904 2-2.126 2" />
                        </svg>
                        PH
                      </a>
                    )}
                  </div>

                  {/* Scout Info */}
                  {project.scout_wallet && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <span className="text-[#FF8C00]">🔍 伯乐</span>
                      <span className="font-mono text-gray-300">
                        {project.scout_wallet.slice(0, 4)}...{project.scout_wallet.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 代币信息 + AI评估（左侧主内容） */}
              <MainContent
                project={project}
                evaluation={evaluation}
                evaluationLoading={evaluationLoading}
                isReEvaluating={isReEvaluating}
                canReEvaluate={canReEvaluate}
                onReEvaluate={handleReEvaluate}
              />
            </div>

            {/* Right Column - 热度+资金流向+评论 */}
            <div className="space-y-6">
              <HeatStats projectId={project.id} githubUrl={project.github} />
              {(project.status === "launched" || project.status === "claimed") && (
                <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-4">资金流向</h3>
                  <RevenueFlow project={project} />
                </div>
              )}
              <ProjectDiscussion projectId={project.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// 主内容区组件（静态布局）
interface MainContentProps {
  project: Project;
  evaluation: ProjectEvaluation | null;
  evaluationLoading: boolean;
  isReEvaluating: boolean;
  canReEvaluate: boolean;
  onReEvaluate: () => void;
}

function MainContent({ 
  project, 
  evaluation, 
  evaluationLoading, 
  isReEvaluating, 
  canReEvaluate, 
  onReEvaluate 
}: MainContentProps) {
  // 构建评估模块
  let evaluationElement: React.ReactNode;
  
  if (evaluationLoading) {
    evaluationElement = <EvaluationLoading />;
  } else if (evaluation) {
    evaluationElement = (
      <EvaluationDetail 
        evaluation={evaluation}
        onReEvaluate={onReEvaluate}
        canReEvaluate={canReEvaluate}
        isReEvaluating={isReEvaluating || !!project.is_evaluating}
      />
    );
  } else if (isReEvaluating || project.is_evaluating) {
    evaluationElement = <EvaluationInProgress />;
  } else {
    evaluationElement = (
      <EvaluationEmpty 
        onTrigger={onReEvaluate}
        canTrigger={canReEvaluate}
      />
    );
  }

  return (
    <div className="space-y-6">
      <TokenList project={project} />
      {evaluationElement}
    </div>
  );
}
