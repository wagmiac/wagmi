"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Sidebar, useSidebar } from "@/components/imo";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { 
  Chain, 
  Launchpad, 
  CHAIN_CONFIG, 
  LAUNCHPAD_CONFIG,
  Project 
} from "@/types/imo";
import { getProjectByTicker, launchProject, generateDevWallet, getDevWallet } from "@/lib/api/imo";

type LaunchStep = "loading" | "not-winner" | "wallet" | "configure" | "confirm" | "launching" | "success";

interface DevWalletInfo {
  address: string;
  hasWallet: boolean;
}

export default function LaunchPage() {
  const params = useParams();
  const router = useRouter();
  const { sidebarWidth } = useSidebar();
  const { address, isConnected } = useWallet();
  
  const [step, setStep] = useState<LaunchStep>("loading");
  const [project, setProject] = useState<Project | null>(null);
  const [devWallet, setDevWallet] = useState<DevWalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 发射配置
  const [launchConfig, setLaunchConfig] = useState({
    launchpad: "pump.fun" as Launchpad,
    ticker: "",
    image: "",
    website: "",
    twitter: "",
    telegram: "",
  });

  const projectId = params.projectId as string;

  // 加载项目信息
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await getProjectByTicker(projectId);
        if (res.success && res.data) {
          setProject(res.data as Project);
          
          // 检查是否是伯乐（发掘者）
          const proj = res.data as Project;
          if (proj.status === "launching") {
            // 项目处于发射中状态
            if (isConnected && address && proj.scoutWallet === address) {
              // 当前用户是伯乐
              checkDevWallet(proj.id);
            } else {
              setStep("not-winner");
            }
          } else {
            setStep("not-winner");
          }
        } else {
          setError("项目不存在");
          setStep("not-winner");
        }
      } catch {
        setError("加载项目失败");
        setStep("not-winner");
      }
    }
    
    loadProject();
  }, [projectId, isConnected, address]);

  // 检查 Dev 钱包状态
  async function checkDevWallet(projectIdNum: string) {
    try {
      const res = await getDevWallet(projectIdNum);
      if (res.success && res.data) {
        const data = res.data as DevWalletInfo;
        setDevWallet(data);
        if (data.hasWallet) {
          setStep("configure");
        } else {
          setStep("wallet");
        }
      } else {
        setStep("wallet");
      }
    } catch {
      setStep("wallet");
    }
  }

  // 生成 Dev 钱包
  async function handleGenerateWallet() {
    if (!project) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const chain = project.chain || "solana";
      const res = await generateDevWallet(project.id, chain);
      
      if (res.success && res.data) {
        const data = res.data as { address: string };
        setDevWallet({ address: data.address, hasWallet: true });
        setStep("configure");
      } else {
        setError("生成钱包失败");
      }
    } catch {
      setError("生成钱包失败");
    } finally {
      setIsLoading(false);
    }
  }

  // 执行发射
  async function handleLaunch() {
    if (!project) return;
    
    setIsLoading(true);
    setError(null);
    setStep("launching");
    
    try {
      const res = await launchProject(project.id, {
        launchpad: launchConfig.launchpad,
        ticker: launchConfig.ticker,
        image: launchConfig.image || project.logo,
        website: launchConfig.website || `https://wagmi.fun/${launchConfig.ticker}`,
        twitter: launchConfig.twitter,
        telegram: launchConfig.telegram,
      });
      
      if (res.success) {
        setStep("success");
      } else {
        setError("发射失败: " + (res.error || res.message || "未知错误"));
        setStep("confirm");
      }
    } catch {
      setError("发射失败");
      setStep("confirm");
    } finally {
      setIsLoading(false);
    }
  }

  // 获取可用的发射台
  const availableLaunchpads = project 
    ? Object.values(LAUNCHPAD_CONFIG).filter(lp => lp.chain === project.chain)
    : [];

  // 渲染步骤内容
  function renderContent() {
    switch (step) {
      case "loading":
        return (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">加载中...</p>
            </div>
          </div>
        );
        
      case "not-winner":
        return (
          <div className="max-w-lg mx-auto py-20 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-white mb-4">无法访问发射页面</h2>
            <p className="text-gray-400 mb-6">
              {error || "您不是此项目的伯乐，或项目状态不正确"}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
            >
              返回首页
            </Link>
          </div>
        );
        
      case "wallet":
        return (
          <div className="max-w-lg mx-auto">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#FF8C00]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">生成 Dev 钱包</h2>
                <p className="text-gray-400">
                  为项目生成专属 Dev 钱包，用于接收创作者分成
                </p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Dev 钱包用途</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-[#10B981]">✓</span>
                    <span>创建代币时作为 creator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#10B981]">✓</span>
                    <span>持续接收交易税分成</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#10B981]">✓</span>
                    <span>分成自动分配给创作者(70%)、伯乐(10%)、平台(20%)</span>
                  </li>
                </ul>
              </div>
              
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 mb-6">
                  <p className="text-[#EF4444] text-sm">{error}</p>
                </div>
              )}
              
              <button
                onClick={handleGenerateWallet}
                disabled={isLoading}
                className="w-full py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    生成中...
                  </span>
                ) : (
                  "生成 Dev 钱包"
                )}
              </button>
            </div>
          </div>
        );
        
      case "configure":
        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">配置发射信息</h2>
              
              {/* Dev 钱包信息 */}
              {devWallet && (
                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Dev 钱包</h3>
                  <p className="font-mono text-sm text-white break-all">{devWallet.address}</p>
                </div>
              )}
              
              {/* 选择发射台 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">选择发射台</label>
                <div className="grid grid-cols-2 gap-3">
                  {availableLaunchpads.map((lp) => (
                    <button
                      key={lp.id}
                      onClick={() => setLaunchConfig({ ...launchConfig, launchpad: lp.id })}
                      className={`p-4 rounded-lg border transition ${
                        launchConfig.launchpad === lp.id
                          ? "border-[#FF8C00] bg-[#FF8C00]/10"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <p className="font-bold text-white">{lp.name}</p>
                      <p className="text-xs text-gray-400">{lp.url}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Ticker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Ticker（全局唯一）
                </label>
                <div className="flex items-center">
                  <span className="px-4 py-3 bg-white/5 border border-r-0 border-white/10 rounded-l-lg text-gray-400">$</span>
                  <input
                    type="text"
                    value={launchConfig.ticker}
                    onChange={(e) => setLaunchConfig({ ...launchConfig, ticker: e.target.value.toUpperCase() })}
                    placeholder="CURSOR"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-r-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]"
                  />
                </div>
              </div>
              
              {/* 项目图片 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">项目图片</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                    {(launchConfig.image || project?.logo) ? (
                      <Image
                        src={launchConfig.image || project?.logo || ""}
                        alt="Project"
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500">
                        📷
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={launchConfig.image}
                    onChange={(e) => setLaunchConfig({ ...launchConfig, image: e.target.value })}
                    placeholder="图片URL（可选，默认使用发掘时的图片）"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]"
                  />
                </div>
              </div>
              
              {/* 网站 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">网站（必填）</label>
                <input
                  type="text"
                  value={launchConfig.website}
                  onChange={(e) => setLaunchConfig({ ...launchConfig, website: e.target.value })}
                  placeholder={`https://wagmi.fun/${launchConfig.ticker || 'TICKER'}`}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]"
                />
              </div>
              
              {/* Twitter & Telegram */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Twitter（可选）</label>
                  <input
                    type="text"
                    value={launchConfig.twitter}
                    onChange={(e) => setLaunchConfig({ ...launchConfig, twitter: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Telegram（可选）</label>
                  <input
                    type="text"
                    value={launchConfig.telegram}
                    onChange={(e) => setLaunchConfig({ ...launchConfig, telegram: e.target.value })}
                    placeholder="@group"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]"
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 mb-6">
                  <p className="text-[#EF4444] text-sm">{error}</p>
                </div>
              )}
              
              <button
                onClick={() => setStep("confirm")}
                disabled={!launchConfig.ticker}
                className="w-full py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步：确认发射
              </button>
            </div>
          </div>
        );
        
      case "confirm":
        return (
          <div className="max-w-lg mx-auto">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#FF8C00]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚀</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">确认发射</h2>
                <p className="text-gray-400">
                  请确认以下信息无误后发射
                </p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">项目名称</span>
                  <span className="text-white font-medium">{project?.name}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Ticker</span>
                  <span className="text-[#FF8C00] font-mono font-bold">${launchConfig.ticker}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">发射台</span>
                  <span className="text-white">{LAUNCHPAD_CONFIG[launchConfig.launchpad]?.name}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">链</span>
                  <span className="text-white">{CHAIN_CONFIG[project?.chain || "solana"]?.name}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">网站</span>
                  <span className="text-white text-sm truncate max-w-[200px]">
                    {launchConfig.website || `https://wagmi.fun/${launchConfig.ticker}`}
                  </span>
                </div>
              </div>
              
              <div className="bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-lg p-4 mb-6">
                <p className="text-[#FF8C00] text-sm">
                  ⚠️ 发射后无法修改 Ticker，请确认无误
                </p>
              </div>
              
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 mb-6">
                  <p className="text-[#EF4444] text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={() => setStep("configure")}
                  className="flex-1 py-4 border border-white/10 text-white font-bold rounded-lg hover:bg-white/5 transition"
                >
                  返回修改
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 确认发射
                </button>
              </div>
            </div>
          </div>
        );
        
      case "launching":
        return (
          <div className="max-w-lg mx-auto py-20">
            <div className="text-center">
              <div className="w-20 h-20 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">正在发射...</h2>
              <p className="text-gray-400 mb-2">正在创建 ${launchConfig.ticker} 代币</p>
              <p className="text-gray-500 text-sm">请勿关闭页面</p>
            </div>
          </div>
        );
        
      case "success":
        return (
          <div className="max-w-lg mx-auto py-20">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">发射成功！</h2>
              <p className="text-gray-400 mb-6">
                ${launchConfig.ticker} 已成功在 {LAUNCHPAD_CONFIG[launchConfig.launchpad]?.name} 上发射
              </p>
              
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">合约地址</p>
                <p className="font-mono text-white text-sm break-all">
                  {/* Mock 合约地址 */}
                  7xKp...3mNq
                </p>
              </div>
              
              <div className="flex gap-4">
                <Link
                  href={`/${launchConfig.ticker}`}
                  className="flex-1 py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition text-center"
                >
                  查看项目
                </Link>
                <a
                  href={LAUNCHPAD_CONFIG[launchConfig.launchpad]?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-4 border border-white/10 text-white font-bold rounded-lg hover:bg-white/5 transition text-center"
                >
                  去交易
                </a>
              </div>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      
      <main 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={project ? `/${project.ticker?.replace('$', '')}` : "/"}
              className="text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <h1 className="text-xl font-bold text-white">🚀 发射代币</h1>
            {project && (
              <>
                <div className="h-6 w-px bg-white/10" />
                <span className="text-[#FF8C00] font-medium">{project.name}</span>
              </>
            )}
          </div>
        </header>
        
        {/* Content */}
        <div className="p-6">
          {/* Progress Steps */}
          {step !== "loading" && step !== "not-winner" && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex items-center justify-center">
                {["wallet", "configure", "confirm", "success"].map((s, i) => {
                  const stepIndex = ["wallet", "configure", "confirm", "success"].indexOf(step === "launching" ? "confirm" : step);
                  const isActive = i === stepIndex;
                  const isCompleted = i < stepIndex;
                  
                  return (
                    <div key={s} className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                          isCompleted
                            ? "bg-[#10B981] text-white"
                            : isActive
                            ? "bg-[#FF8C00] text-black"
                            : "bg-white/10 text-gray-500"
                        }`}
                      >
                        {isCompleted ? "✓" : i + 1}
                      </div>
                      {i < 3 && (
                        <div className={`w-16 h-1 mx-2 ${isCompleted ? "bg-[#10B981]" : "bg-white/10"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 px-2">
                <span className="text-xs text-gray-400 w-10 text-center">钱包</span>
                <span className="text-xs text-gray-400 w-16 text-center">配置</span>
                <span className="text-xs text-gray-400 w-16 text-center">确认</span>
                <span className="text-xs text-gray-400 w-10 text-center">完成</span>
              </div>
            </div>
          )}
          
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
