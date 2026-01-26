"use client";

import { useState } from "react";
import { useSidebar } from "@/components/imo/SidebarContext";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { createProject } from "@/lib/api/imo";
import { Chain, CHAIN_CONFIG, LAUNCHPAD_CONFIG } from "@/types/imo";
import Link from "next/link";

// 发掘费用配置
const DISCOVERY_FEE = {
  amount: 99,
  currency: "USDT",
  // 平台收款地址
  solanaAddress: "WAGMi1111111111111111111111111111111111111",
  bscAddress: "0xWAGMI111111111111111111111111111111111111",
};

interface FormData {
  name: string;
  ticker: string;
  chain: Chain;
  launchpad: string;
  description: string;
  logo: string;
  twitter: string;
  github: string;
  website: string;
}

const initialFormData: FormData = {
  name: "",
  ticker: "",
  chain: "solana",
  launchpad: "pump.fun",
  description: "",
  logo: "",
  twitter: "",
  github: "",
  website: "",
};

type StepType = "form" | "payment" | "processing" | "success";

export default function SubmitProjectPage() {
  const { sidebarWidth } = useSidebar();
  const { isConnected, address, chain: walletChain, signMessage } = useWallet();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepType>("form");
  const [createdTicker, setCreatedTicker] = useState<string | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);

  // 根据选中的链筛选可用发射台
  const availableLaunchpads = Object.values(LAUNCHPAD_CONFIG).filter(
    (lp) => lp.chain === formData.chain
  );

  // 切换链时自动选择第一个可用的发射台
  function handleChainChange(chain: Chain) {
    const firstLaunchpad = Object.values(LAUNCHPAD_CONFIG).find(
      (lp) => lp.chain === chain
    );
    setFormData({
      ...formData,
      chain,
      launchpad: firstLaunchpad?.id || "",
    });
  }

  // 表单字段更新
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // 验证表单
  function validateForm(): string | null {
    if (!formData.name.trim()) return "请输入项目名称";
    if (!formData.ticker.trim()) return "请输入代币符号";
    if (formData.ticker.length > 10) return "代币符号最多10个字符";
    if (!/^[A-Z0-9]+$/i.test(formData.ticker)) return "代币符号只能包含字母和数字";
    if (!formData.description.trim()) return "请输入项目描述";
    if (formData.description.length < 20) return "项目描述至少20个字符";
    return null;
  }

  // 进入支付步骤
  function handleGoToPayment() {
    if (!isConnected) {
      setError("请先连接钱包");
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep("payment");
  }

  // 模拟支付流程
  async function handlePayment() {
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. 签名确认支付意图
      const message = `WAGMI Discovery Fee: ${DISCOVERY_FEE.amount} ${DISCOVERY_FEE.currency}\nProject: ${formData.name}\nTicker: ${formData.ticker.toUpperCase()}\nWallet: ${address}`;
      const signature = await signMessage(message);
      
      if (!signature) {
        throw new Error("签名被拒绝");
      }

      setStep("processing");

      // 2. 模拟 USDT 转账（真实环境需要调用链上合约）
      // 这里生成一个模拟的交易哈希
      const mockTxHash = walletChain === "solana" 
        ? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
        : `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
      
      setPaymentTxHash(mockTxHash);

      // 模拟交易确认延迟
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. 提交项目到后端（包含支付信息）
      const res = await createProject({
        name: formData.name,
        ticker: formData.ticker.toUpperCase(),
        chain: formData.chain,
        launchpad: formData.launchpad,
        description: formData.description,
        logo: formData.logo || undefined,
        twitter: formData.twitter || undefined,
        github: formData.github || undefined,
        website: formData.website || undefined,
      });

      if (res.success) {
        setCreatedTicker(formData.ticker.toUpperCase());
        setStep("success");
      } else {
        throw new Error(res.error || "提交失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "支付失败");
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  const chainConfig = CHAIN_CONFIG[formData.chain];

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 transition-all duration-300 pb-24 md:pb-8 pt-20 md:pt-8"
      style={{ marginLeft: sidebarWidth }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Link href="/" className="text-gray-400 hover:text-white text-sm mb-3 md:mb-4 inline-block">
            ← 返回首页
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">提交项目</h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            提交一个项目进行 IMO（Initial Meme Offering）
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8 overflow-x-auto scrollbar-hide">
          {["填写信息", "支付 $99", "发掘成功"].map((label, idx) => {
            const stepNum = idx + 1;
            const currentStep = step === "form" ? 1 : (step === "payment" || step === "processing") ? 2 : 3;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;

            return (
              <div key={label} className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <div
                  className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                    isActive
                      ? "bg-[#FF8C00] text-black"
                      : isCompleted
                      ? "bg-green-500 text-black"
                      : "bg-white/10 text-gray-500"
                  }`}
                >
                  {isCompleted ? "✓" : stepNum}
                </div>
                <span className={`text-xs md:text-sm ${isActive ? "text-white" : "text-gray-500"}`}>
                  {label}
                </span>
                {idx < 2 && (
                  <div className="w-4 md:w-8 h-px bg-white/10 mx-1 md:mx-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Step */}
        {step === "form" && (
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
            {/* 基本信息 */}
            <div>
              <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4">基本信息</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm text-gray-400 mb-1.5 md:mb-2">
                    项目名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="如：Cursor AI"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    代币符号 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="ticker"
                    value={formData.ticker}
                    onChange={handleChange}
                    placeholder="如：CURSOR"
                    maxLength={10}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* 链和发射台 */}
            <div>
              <h2 className="text-lg font-bold mb-4">链和发射台</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">选择链</label>
                  <div className="flex gap-2">
                    {(["solana", "bsc"] as Chain[]).map((chain) => (
                      <button
                        key={chain}
                        onClick={() => handleChainChange(chain)}
                        className={`flex-1 px-4 py-3 rounded-lg border transition flex items-center justify-center gap-2 ${
                          formData.chain === chain
                            ? chain === "solana"
                              ? "border-purple-500 bg-purple-500/10 text-purple-400"
                              : "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                            : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <span>{chain === "solana" ? "◎" : "🔶"}</span>
                        {chain.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">发射台</label>
                  <select
                    name="launchpad"
                    value={formData.launchpad}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF8C00]/50"
                  >
                    {availableLaunchpads.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        {lp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 项目描述 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                项目描述 <span className="text-red-400">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="介绍一下这个项目..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 字符
              </p>
            </div>

            {/* 社交链接 */}
            <div>
              <h2 className="text-lg font-bold mb-4">社交链接（选填）</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Twitter</label>
                  <input
                    type="text"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    placeholder="https://twitter.com/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">GitHub</label>
                  <input
                    type="text"
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">官网</label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleGoToPayment}
                className="flex-1 px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
              >
                下一步：支付 $99
              </button>
            </div>

            {!isConnected && (
              <p className="text-center text-sm text-gray-500">
                请先连接钱包后再提交
              </p>
            )}
          </div>
        )}

        {/* Payment Step */}
        {step === "payment" && (
          <div className="space-y-6">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-3xl">
                  {formData.logo || "🚀"}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{formData.name}</h2>
                  <p className="text-[#FF8C00] font-mono">${formData.ticker.toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">链</p>
                  <p className={`font-medium ${formData.chain === "solana" ? "text-purple-400" : "text-yellow-400"}`}>
                    {formData.chain.toUpperCase()}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">发射台</p>
                  <p className="font-medium text-white">
                    {LAUNCHPAD_CONFIG[formData.launchpad as keyof typeof LAUNCHPAD_CONFIG]?.name || formData.launchpad}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-2">项目描述</p>
                <p className="text-gray-300">{formData.description}</p>
              </div>

              {(formData.twitter || formData.github || formData.website) && (
                <div className="flex gap-4">
                  {formData.twitter && (
                    <a href={formData.twitter} target="_blank" rel="noopener noreferrer" className="text-[#FF8C00] hover:underline text-sm">
                      Twitter
                    </a>
                  )}
                  {formData.github && (
                    <a href={formData.github} target="_blank" rel="noopener noreferrer" className="text-[#FF8C00] hover:underline text-sm">
                      GitHub
                    </a>
                  )}
                  {formData.website && (
                    <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-[#FF8C00] hover:underline text-sm">
                      官网
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 费用说明 */}
            <div className="bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-xl p-4">
              <h3 className="font-bold text-[#FF8C00] mb-2">💰 发掘费用</h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">发掘费</span>
                <span className="text-2xl font-bold text-white">${DISCOVERY_FEE.amount} {DISCOVERY_FEE.currency}</span>
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 支付后项目将进入「待竞拍」阶段</li>
                <li>• 您将成为项目的「伯乐」，永久获得 <span className="text-[#FF8C00] font-bold">10%</span> 交易分成</li>
                <li>• 发掘费用不可退还</li>
              </ul>
            </div>

            {/* 收款地址 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">收款地址 ({walletChain === "solana" ? "Solana" : "BSC"})</p>
              <p className="font-mono text-sm text-white break-all">
                {walletChain === "solana" ? DISCOVERY_FEE.solanaAddress : DISCOVERY_FEE.bscAddress}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep("form")}
                className="px-6 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition"
              >
                返回修改
              </button>
              <button
                onClick={handlePayment}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                确认支付 ${DISCOVERY_FEE.amount}
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="bg-[#111111] border border-[#FF8C00]/30 rounded-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FF8C00]/20 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">处理中...</h2>
            <p className="text-gray-400 mb-4">正在确认交易并提交项目</p>
            {paymentTxHash && (
              <p className="text-xs text-gray-500 font-mono">
                交易哈希: {paymentTxHash.slice(0, 20)}...
              </p>
            )}
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="bg-[#111111] border border-green-500/30 rounded-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">🎉 发掘成功！</h2>
            <p className="text-gray-400 mb-2">
              您已成功发掘项目 <span className="text-[#FF8C00] font-bold">${createdTicker}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              恭喜您成为这个项目的伯乐！项目发射后，您将永久获得 10% 的交易分成。
            </p>
            
            {paymentTxHash && (
              <div className="bg-white/5 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-500 mb-1">交易哈希</p>
                <p className="text-sm font-mono text-white break-all">{paymentTxHash}</p>
              </div>
            )}
            
            <div className="flex gap-4 justify-center">
              <Link
                href={`/${createdTicker?.toLowerCase()}`}
                className="px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
              >
                查看项目
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition"
              >
                返回首页
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
