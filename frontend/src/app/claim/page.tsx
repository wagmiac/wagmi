"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, useSidebar } from "@/components/imo";
import { useWallet } from "@/lib/wallet/MultiWalletProvider";
import { REVENUE_SPLIT } from "@/types/imo";

export default function ClaimIndexPage() {
  const { sidebarWidth } = useSidebar();
  const { isConnected, connect } = useWallet();
  const [searchTicker, setSearchTicker] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTicker.trim()) {
      const ticker = searchTicker.replace(/^\$/, "").trim().toUpperCase();
      window.location.href = `/claim/${ticker}`;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />

      <main 
        className="flex-1 transition-all duration-300 pb-20 md:pb-0 pt-16 md:pt-0"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="sticky top-0 md:top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-4 md:px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-white">创作者认领</h1>
          <p className="text-sm text-gray-400 mt-1">验证身份，认领您的项目社区</p>
        </header>

        <div className="p-4 md:p-6 max-w-3xl mx-auto">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-[#FF8C00]/20 to-transparent border border-[#FF8C00]/30 rounded-2xl p-6 md:p-8 mb-8 text-center">
            <div className="text-5xl md:text-6xl mb-4">🏆</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              您的项目被发掘了？
            </h2>
            <p className="text-gray-300 mb-6 max-w-xl mx-auto">
              如果您是被 wagmi 社区发掘的项目创作者，通过验证身份即可认领社区，
              获得 <span className="text-[#FF8C00] font-bold">{REVENUE_SPLIT.creator * 100}%</span> 的持续分成收益
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value)}
                  placeholder="输入项目 Ticker（如 CURSOR）"
                  className="w-full pl-8 pr-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 transition uppercase"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition whitespace-nowrap"
              >
                开始认领
              </button>
            </form>
          </div>

          {/* How it Works */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📋</span>
              认领流程
            </h3>
            
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "找到您的项目",
                  desc: "在 wagmi 首页搜索您的项目名或 Ticker",
                  icon: "🔍",
                },
                {
                  step: 2,
                  title: "连接钱包",
                  desc: "连接您用于接收分成的钱包地址",
                  icon: "👛",
                },
                {
                  step: 3,
                  title: "验证身份",
                  desc: "通过官方 Twitter/GitHub/官网 发布验证内容",
                  icon: "✅",
                },
                {
                  step: 4,
                  title: "等待审核",
                  desc: "wagmi 团队将在 24 小时内审核您的申请",
                  icon: "⏳",
                },
                {
                  step: 5,
                  title: "开始获得分成",
                  desc: `审核通过后，您将开始获得 ${REVENUE_SPLIT.creator * 100}% 的交易分成`,
                  icon: "💰",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#FF8C00]/20 flex items-center justify-center text-xl">
                    {item.icon}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#FF8C00] text-sm font-mono">STEP {item.step}</span>
                      <h4 className="font-bold text-white">{item.title}</h4>
                    </div>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Methods */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🔐</span>
              验证方式
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="font-bold text-white">Twitter</span>
                </div>
                <p className="text-sm text-gray-400">
                  从项目官方 Twitter 账号发布包含验证码的推文
                </p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-bold text-white">GitHub</span>
                </div>
                <p className="text-sm text-gray-400">
                  在项目仓库创建包含验证码的 Issue 或 Gist
                </p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="font-bold text-white">官网</span>
                </div>
                <p className="text-sm text-gray-400">
                  在官网特定路径放置验证文件
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🎁</span>
              认领后的收益
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💰</div>
                <div>
                  <h4 className="font-bold text-white mb-1">{REVENUE_SPLIT.creator * 100}% 持续分成</h4>
                  <p className="text-sm text-gray-400">每笔代币交易产生的手续费中，您将获得 {REVENUE_SPLIT.creator * 100}% 的分成</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="text-2xl">🏆</div>
                <div>
                  <h4 className="font-bold text-white mb-1">官方认证标识</h4>
                  <p className="text-sm text-gray-400">项目页面将显示「已认领」状态，增加社区信任</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="text-2xl">📈</div>
                <div>
                  <h4 className="font-bold text-white mb-1">首批资金释放</h4>
                  <p className="text-sm text-gray-400">根据验证图标数量，最高可获得 25% 的首批资金释放</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="text-2xl">🤝</div>
                <div>
                  <h4 className="font-bold text-white mb-1">社区连接</h4>
                  <p className="text-sm text-gray-400">与已投资您项目的社区成员建立联系</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center py-6">
            {!isConnected ? (
              <div>
                <p className="text-gray-400 mb-4">请先连接钱包以开始认领流程</p>
                <button
                  onClick={() => connect("phantom")}
                  className="px-8 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
                >
                  连接钱包
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-4">准备好了？搜索您的项目开始认领</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
                >
                  浏览所有项目
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* FAQ Link */}
          <div className="text-center border-t border-white/10 pt-6">
            <p className="text-gray-400 text-sm">
              有疑问？查看{" "}
              <Link href="/help" className="text-[#FF8C00] hover:underline">
                帮助中心
              </Link>
              {" "}或联系{" "}
              <a href="mailto:hello@wagmi.fun" className="text-[#FF8C00] hover:underline">
                hello@wagmi.fun
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
