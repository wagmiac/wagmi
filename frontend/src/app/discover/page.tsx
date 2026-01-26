"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, useSidebar } from "@/components/imo";
import { Chain, Launchpad, CHAIN_CONFIG, LAUNCHPAD_CONFIG, DISCOVER_FEE } from "@/types/imo";

export default function DiscoverPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    url: "",
    name: "",
    ticker: "",
    description: "",
    chain: "solana" as Chain,
    launchpad: "pump.fun" as Launchpad,
    firstBuyAmount: 100, // 伯乐首单金额 (USDT)
  });
  const [isLoading, setIsLoading] = useState(false);
  const { sidebarWidth } = useSidebar();

  const availableLaunchpads = Object.values(LAUNCHPAD_CONFIG).filter(
    (lp) => lp.chain === formData.chain
  );

  const handleChainChange = (chain: Chain) => {
    setFormData({
      ...formData,
      chain,
      launchpad: CHAIN_CONFIG[chain].launchpads[0],
    });
  };

  const totalPayment = DISCOVER_FEE + formData.firstBuyAmount;

  const handleSubmit = async () => {
    setIsLoading(true);
    // TODO: 实际提交逻辑 - 支付 $99 发掘费 + 首单金额
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    setStep(3);
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
            <h1 className="text-xl font-bold text-white">发掘项目</h1>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-2xl mx-auto p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step >= s
                      ? "bg-[#FF8C00] text-black"
                      : "bg-white/10 text-gray-500"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-20 h-1 mx-2 ${
                      step > s ? "bg-[#FF8C00]" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Project Info */}
          {step === 1 && (
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">项目信息</h2>

              <div className="space-y-4">
                {/* URL */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    项目链接 <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    项目名称 <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：Cursor"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>

                {/* Ticker */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    代币符号 <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF8C00]">$</span>
                    <input
                      type="text"
                      value={formData.ticker}
                      onChange={(e) =>
                        setFormData({ ...formData, ticker: e.target.value.toUpperCase() })
                      }
                      placeholder="CURSOR"
                      maxLength={10}
                      className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 uppercase"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    项目描述 <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="简要描述这个项目..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!formData.url || !formData.name || !formData.ticker || !formData.description}
                className="w-full mt-6 px-4 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            </div>
          )}

          {/* Step 2: Chain & Payment */}
          {step === 2 && (
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">选择发射链</h2>

              {/* Chain Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {Object.values(CHAIN_CONFIG).map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => handleChainChange(chain.id)}
                    className={`p-4 rounded-lg border transition ${
                      formData.chain === chain.id
                        ? "border-[#FF8C00] bg-[#FF8C00]/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        {chain.id === "solana" ? "◎" : "🔶"}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white">{chain.name}</p>
                        <p className="text-xs text-gray-400">
                          {chain.currency}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Launchpad Selection */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">发射台</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableLaunchpads.map((lp) => (
                    <button
                      key={lp.id}
                      onClick={() => setFormData({ ...formData, launchpad: lp.id })}
                      className={`p-3 rounded-lg border text-sm transition ${
                        formData.launchpad === lp.id
                          ? "border-[#FF8C00] bg-[#FF8C00]/10 text-white"
                          : "border-white/10 text-gray-400 hover:border-white/30"
                      }`}
                    >
                      {lp.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee Info */}
              <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-4">
                {/* 首单金额输入 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    首单购买金额 (USDT) <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.firstBuyAmount}
                    onChange={(e) => setFormData({ ...formData, firstBuyAmount: Math.max(1, parseInt(e.target.value) || 0) })}
                    min={1}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    作为伯乐，您将以发射价买入首批代币
                  </p>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">发掘费用</span>
                    <span className="text-white">${DISCOVER_FEE}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">首单购买</span>
                    <span className="text-white">${formData.firstBuyAmount}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-white font-bold">总计</span>
                    <span className="text-[#FF8C00] font-bold text-lg">${totalPayment}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  🔍 伯乐权益：10% 持续分成 + 命名权 + 首批代币
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-3 border border-white/20 text-white rounded-lg hover:bg-white/5 transition"
                >
                  上一步
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || formData.firstBuyAmount < 1}
                  className="flex-1 px-4 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50"
                >
                  {isLoading ? "支付中..." : `支付 $${totalPayment} 发射`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6 text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-white mb-2">发射成功！</h2>
              <p className="text-gray-400 mb-6">
                ${formData.ticker} 已成功发射！代币正在创建中...
              </p>

              <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">项目</span>
                  <span className="text-white">{formData.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">代币符号</span>
                  <span className="text-[#FF8C00] font-mono">${formData.ticker}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">发射链</span>
                  <span className="text-white">{CHAIN_CONFIG[formData.chain].name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">您的首单</span>
                  <span className="text-[#10B981] font-bold">${formData.firstBuyAmount}</span>
                </div>
              </div>

              <div className="bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-[#FF8C00]">
                  🔍 作为伯乐，您将获得：
                </p>
                <ul className="text-sm text-white mt-2 space-y-1">
                  <li>✓ 10% 持续交易分成</li>
                  <li>✓ 代币命名权</li>
                  <li>✓ ${formData.firstBuyAmount} 首批代币</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Link
                  href="/"
                  className="flex-1 px-4 py-3 border border-white/20 text-white rounded-lg hover:bg-white/5 transition text-center"
                >
                  返回首页
                </Link>
                <Link
                  href={`/${formData.ticker}`}
                  className="flex-1 px-4 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition text-center"
                >
                  查看项目
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
