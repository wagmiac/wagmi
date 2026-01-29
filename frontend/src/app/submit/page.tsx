"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "@/components/imo/SidebarContext";
import { useWallet, useMultiWallet } from "@/lib/wallet/MultiWalletProvider";
import { createProject, validatePromoCode, getWalletNonce, verifyWallet, getIMOToken, setIMOToken, uploadProjectLogo } from "@/lib/api/imo";
import Image from "next/image";
import { Chain } from "@/types/imo";
import Link from "next/link";
import { ConnectWalletModal } from "@/components/imo/WalletButton";
import { 
  getPlatformWallet, 
  isPaymentConfigured, 
  payForDiscoveryWithStablecoin,
  getDiscoveryFee,
  getStablecoinName,
} from "@/lib/payment";

interface FormData {
  name: string;
  ticker: string;
  description: string;
  logo: string;
  twitter: string;
  telegram: string;
  github: string;
  website: string;
  productHunt: string;
  discord: string;
  reddit: string;
}

const initialFormData: FormData = {
  name: "",
  ticker: "",
  description: "",
  logo: "",
  twitter: "",
  telegram: "",
  github: "",
  website: "",
  productHunt: "",
  discord: "",
  reddit: "",
};

type StepType = "form" | "payment" | "processing" | "success";

export default function SubmitProjectPage() {
  const { sidebarWidth } = useSidebar();
  const { isConnected, address, chain: walletChain, signMessage } = useWallet();
  const { hasWalletForChain, getWalletByChain } = useMultiWallet();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepType>("form");
  const [createdTicker, setCreatedTicker] = useState<string | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);
  const [showBindWalletModal, setShowBindWalletModal] = useState(false);

  // 免单码相关状态
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoCodeValidated, setPromoCodeValidated] = useState<boolean>(false);
  const [promoCodeValidating, setPromoCodeValidating] = useState<boolean>(false);
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);

  // 图片上传状态
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // IMO 认证状态
  const [imoAuthenticated, setImoAuthenticated] = useState<boolean>(false);
  const [imoAuthenticating, setImoAuthenticating] = useState<boolean>(false);

  // 用户选择的支付链（默认使用当前连接的链，如果没有则默认 solana）
  const [selectedPaymentChain, setSelectedPaymentChain] = useState<Chain>(walletChain || "solana");
  
  // 获取发掘费用（基于选择的链）
  const discoveryFee = getDiscoveryFee(selectedPaymentChain);
  const stablecoinName = getStablecoinName(selectedPaymentChain);

  // 检查是否已有 IMO token
  useEffect(() => {
    const token = getIMOToken();
    if (token) {
      setImoAuthenticated(true);
    }
  }, []);

  // IMO 钱包认证
  async function authenticateIMO(): Promise<boolean> {
    if (!address) {
      setError("请先连接钱包");
      return false;
    }

    setImoAuthenticating(true);
    try {
      // 1. 获取 nonce
      const nonceResult = await getWalletNonce(address);
      if (!nonceResult.success || !nonceResult.data) {
        throw new Error(nonceResult.error || "获取签名消息失败");
      }

      const { message } = nonceResult.data as { nonce: string; message: string };

      // 2. 签名
      const signature = await signMessage(message, walletChain || "solana");
      if (!signature) {
        throw new Error("签名被拒绝");
      }

      // 3. 验证签名
      const verifyResult = await verifyWallet({
        wallet: address,
        signature,
        chain: (walletChain || "solana") as 'solana' | 'bsc',
      });

      if (!verifyResult.success || !verifyResult.data) {
        throw new Error(verifyResult.error || "钱包验证失败");
      }

      const { token } = verifyResult.data as { user: unknown; token: string };
      if (token) {
        setIMOToken(token);
        setImoAuthenticated(true);
        return true;
      }

      throw new Error("未获取到认证令牌");
    } catch (err) {
      const message = err instanceof Error ? err.message : "认证失败";
      if (message.includes("rejected") || message.includes("拒绝")) {
        setError("您取消了签名请求");
      } else {
        setError(message);
      }
      return false;
    } finally {
      setImoAuthenticating(false);
    }
  }

  // 表单字段更新
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // 验证免单码
  async function handleValidatePromoCode() {
    if (!promoCode.trim()) {
      setPromoCodeError("请输入免单码");
      return;
    }

    setPromoCodeValidating(true);
    setPromoCodeError(null);

    try {
      const result = await validatePromoCode(promoCode.trim());
      if (result.success && result.valid) {
        setPromoCodeValidated(true);
        setPromoCodeError(null);
      } else {
        setPromoCodeValidated(false);
        setPromoCodeError(result.error || "免单码无效");
      }
    } catch {
      setPromoCodeValidated(false);
      setPromoCodeError("验证失败，请重试");
    } finally {
      setPromoCodeValidating(false);
    }
  }

  // 清除免单码
  function handleClearPromoCode() {
    setPromoCode("");
    setPromoCodeValidated(false);
    setPromoCodeError(null);
  }

  // 处理图片选择
  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError("只支持 PNG、JPG、GIF、WebP 格式的图片");
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("图片大小不能超过 5MB");
      return;
    }

    setLogoError(null);
    setLogoFile(file);

    // 创建预览
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 上传图片
    setLogoUploading(true);
    try {
      const result = await uploadProjectLogo(file);
      if (result.success && result.data) {
        // 上传 API 已经返回完整 URL，直接使用
        setFormData(prev => ({ ...prev, logo: result.data!.url }));
        setLogoError(null);
      } else {
        setLogoError(result.error || "上传失败");
      }
    } catch {
      setLogoError("上传失败，请重试");
    } finally {
      setLogoUploading(false);
    }
  }

  // 清除图片
  function handleLogoClear() {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo: "" }));
    setLogoError(null);
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

  // 支付流程
  async function handlePayment() {
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    // 检查 IMO 认证
    if (!imoAuthenticated) {
      setError(null);
      const authenticated = await authenticateIMO();
      if (!authenticated) {
        return;
      }
    }

    // 如果使用免单码
    if (promoCodeValidated) {
      setIsSubmitting(true);
      setError(null);
      setStep("processing");

      try {
        // 直接提交项目（使用免单码，无需支付）
        const res = await createProject({
          name: formData.name,
          ticker: formData.ticker.toUpperCase(),
          description: formData.description,
          logo: formData.logo || undefined,
          twitter: formData.twitter || undefined,
          telegram: formData.telegram || undefined,
          github: formData.github || undefined,
          website: formData.website || undefined,
          productHunt: formData.productHunt || undefined,
          discord: formData.discord || undefined,
          reddit: formData.reddit || undefined,
          promoCode: promoCode.trim(),
        });

        if (res.success) {
          setCreatedTicker(formData.ticker.toUpperCase());
          setStep("success");
        } else {
          throw new Error(res.error || "提交失败");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "提交失败");
        setStep("payment");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 正常支付流程（$99 稳定币）
    setIsSubmitting(true);
    setError(null);

    try {
      // 检查收款地址是否已配置
      if (!isPaymentConfigured(selectedPaymentChain)) {
        throw new Error(`${selectedPaymentChain.toUpperCase()} 链的收款地址未配置，请联系管理员`);
      }

      // 获取选中链对应的钱包
      const paymentWallet = getWalletByChain(selectedPaymentChain);
      if (!paymentWallet?.address) {
        throw new Error(`请先连接 ${selectedPaymentChain.toUpperCase()} 链的钱包`);
      }

      setStep("processing");

      // 执行稳定币转账（钱包会弹出交易签名确认）
      const paymentResult = await payForDiscoveryWithStablecoin(selectedPaymentChain, paymentWallet.address);
      
      if (!paymentResult.success || !paymentResult.txHash) {
        throw new Error(paymentResult.error || "支付失败");
      }
      
      const txHash = paymentResult.txHash;
      setPaymentTxHash(txHash);

      // 提交项目到后端（包含支付信息）
      const res = await createProject({
        name: formData.name,
        ticker: formData.ticker.toUpperCase(),
        description: formData.description,
        logo: formData.logo || undefined,
        twitter: formData.twitter || undefined,
        telegram: formData.telegram || undefined,
        github: formData.github || undefined,
        website: formData.website || undefined,
        productHunt: formData.productHunt || undefined,
        discord: formData.discord || undefined,
        reddit: formData.reddit || undefined,
        // 传递支付信息供后端验证
        paymentTxHash: txHash,
        payerAddress: paymentWallet.address,
      });

      if (res.success) {
        setCreatedTicker(formData.ticker.toUpperCase());
        setStep("success");
      } else {
        throw new Error(res.error || "提交失败");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "支付失败";
      // 用户拒绝签名的友好提示
      if (message.includes("rejected") || message.includes("拒绝")) {
        setError("您取消了签名请求");
      } else {
        setError(message);
      }
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  // 未登录状态显示提示
  if (!isConnected) {
    return (
      <main
        className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 transition-all duration-300 pb-24 md:pb-8 pt-20 md:pt-8"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-[#111111] border border-white/10 rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FF8C00]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-3">请先连接钱包</h2>
            <p className="text-gray-400 mb-6 text-sm">
              发掘项目需要连接钱包登录后才能继续
            </p>
            <ConnectWalletModal
              isOpen={showBindWalletModal}
              onClose={() => setShowBindWalletModal(false)}
              mode="connect"
            />
            <button
              onClick={() => setShowBindWalletModal(true)}
              className="px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
            >
              连接钱包
            </button>
            <Link
              href="/"
              className="block mt-4 text-gray-400 hover:text-white text-sm"
            >
              ← 返回首页
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
          <h1 className="text-2xl md:text-3xl font-bold">发掘项目</h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            发掘一个独特的 Ticker，成为项目伯乐，享受未来 10% 收益分成
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8 overflow-x-auto scrollbar-hide">
          {["填写信息", "支付", "发掘成功"].map((label, idx) => {
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

            {/* 项目图片（选填） */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                项目 Logo（选填）
              </label>
              <div className="flex items-start gap-4">
                {/* 图片预览区域 */}
                <div className="relative w-24 h-24 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                  {logoPreview ? (
                    <>
                      <Image
                        src={logoPreview}
                        alt="Logo 预览"
                        fill
                        className="object-cover"
                      />
                      {logoUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleLogoClear}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center hover:bg-black transition"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition">
                      <svg className="w-8 h-8 text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-gray-500">上传图片</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                
                {/* 提示信息 */}
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-2">
                    建议上传正方形图片（如 200x200），支持 PNG、JPG、GIF、WebP 格式，最大 5MB
                  </p>
                  {logoError && (
                    <p className="text-xs text-red-400">{logoError}</p>
                  )}
                  {formData.logo && !logoError && (
                    <p className="text-xs text-green-400">✓ 图片已上传</p>
                  )}
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

            {/* 媒体链接 */}
            <div>
              <h2 className="text-lg font-bold mb-4">媒体链接（选填）</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Twitter / X</label>
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
                  <label className="block text-sm text-gray-400 mb-2">Telegram</label>
                  <input
                    type="text"
                    name="telegram"
                    value={formData.telegram}
                    onChange={handleChange}
                    placeholder="https://t.me/..."
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
                  <label className="block text-sm text-gray-400 mb-2">Product Hunt</label>
                  <input
                    type="text"
                    name="productHunt"
                    value={formData.productHunt}
                    onChange={handleChange}
                    placeholder="https://www.producthunt.com/products/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Discord</label>
                  <input
                    type="text"
                    name="discord"
                    value={formData.discord}
                    onChange={handleChange}
                    placeholder="https://discord.gg/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Reddit</label>
                  <input
                    type="text"
                    name="reddit"
                    value={formData.reddit}
                    onChange={handleChange}
                    placeholder="https://reddit.com/r/..."
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
                className="flex-1 px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步：支付 ${discoveryFee.amount} {stablecoinName}
              </button>
            </div>

            {/* 发掘费用说明 */}
            <div className="bg-gradient-to-r from-[#FF8C00]/10 to-transparent border border-[#FF8C00]/30 rounded-xl p-4">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <span className="text-[#FF8C00]">🔍</span>
                发掘费用说明
              </h2>
              <p className="text-sm text-gray-400">
                支付 $99 发掘费，即可认领这个 Ticker，成为项目伯乐，享受未来 10% 收益分成
              </p>
              <p className="text-xs text-gray-500 mt-2">
                使用 BSC 链 USDT 或 Solana 链 USDC 支付
              </p>
            </div>

            {!isConnected && (
              <p className="text-center text-sm text-gray-500">
                请先连接钱包后再发掘
              </p>
            )}
          </div>
        )}

        {/* Payment Step */}
        {step === "payment" && (
          <div className="space-y-6">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-3xl overflow-hidden relative">
                  {formData.logo ? (
                    <Image
                      src={formData.logo}
                      alt={formData.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span>🚀</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{formData.name}</h2>
                  <p className="text-[#FF8C00] font-mono">${formData.ticker.toUpperCase()}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-2">选择支付链</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedPaymentChain("solana")}
                    className={`flex-1 p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                      selectedPaymentChain === "solana"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-2xl">◎</span>
                    <span className={`font-medium ${selectedPaymentChain === "solana" ? "text-purple-400" : "text-gray-400"}`}>
                      Solana
                    </span>
                    <span className={`text-sm ${selectedPaymentChain === "solana" ? "text-purple-300" : "text-gray-500"}`}>
                      USDC
                    </span>
                    {!hasWalletForChain("solana") && (
                      <span className="text-xs text-orange-400">需连接钱包</span>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedPaymentChain("bsc")}
                    className={`flex-1 p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                      selectedPaymentChain === "bsc"
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-2xl">🔶</span>
                    <span className={`font-medium ${selectedPaymentChain === "bsc" ? "text-yellow-400" : "text-gray-400"}`}>
                      BSC
                    </span>
                    <span className={`text-sm ${selectedPaymentChain === "bsc" ? "text-yellow-300" : "text-gray-500"}`}>
                      USDT
                    </span>
                    {!hasWalletForChain("bsc") && (
                      <span className="text-xs text-orange-400">需连接钱包</span>
                    )}
                  </button>
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

            {/* 支付明细 */}
            <div className="bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-xl p-4">
              <h3 className="font-bold text-[#FF8C00] mb-3">💰 支付明细</h3>
              
              {/* 免单码已验证 */}
              {promoCodeValidated ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-green-400 font-medium">免单码已生效</span>
                    </div>
                    <button
                      onClick={handleClearPromoCode}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      取消使用
                    </button>
                  </div>
                  
                  {/* 免单后的费用明细 */}
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">发掘费</span>
                      <span className="text-green-400 font-medium line-through">${discoveryFee.amount} {stablecoinName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400"></span>
                      <span className="text-green-400 text-sm">✓ 已免除</span>
                    </div>
                    {/* 分隔线 */}
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 font-medium">实际支付</span>
                        <span className="text-2xl font-bold text-green-400">$0</span>
                      </div>
                      <p className="text-xs text-green-400 mt-1 text-right">已省 ${discoveryFee.amount} 发掘费</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 免单码输入 */}
                  <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">🎟️ 有免单码？</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoCodeValidated(false);
                          setPromoCodeError(null);
                        }}
                        placeholder="输入免单码"
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 text-sm"
                      />
                      <button
                        onClick={handleValidatePromoCode}
                        disabled={promoCodeValidating || !promoCode.trim()}
                        className="px-4 py-2 bg-[#FF8C00]/20 text-[#FF8C00] font-medium rounded-lg hover:bg-[#FF8C00]/30 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {promoCodeValidating ? "验证中..." : "验证"}
                      </button>
                    </div>
                    {promoCodeError && (
                      <p className="text-xs text-red-400 mt-2">{promoCodeError}</p>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    {/* 发掘费 */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">发掘费</span>
                      <span className="text-white font-medium">${discoveryFee.amount} {stablecoinName}</span>
                    </div>
                    {/* 分隔线 */}
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 font-medium">合计</span>
                        <span className="text-2xl font-bold text-[#FF8C00]">${discoveryFee.amount} {stablecoinName}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 支付后项目将进入「待竞拍」阶段</li>
                <li>• 您将成为项目的「伯乐」，永久获得 <span className="text-[#FF8C00] font-bold">10%</span> 交易分成</li>
                {!promoCodeValidated && <li>• 发掘费不可退还</li>}
              </ul>
            </div>

            {/* 收款地址 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">收款地址 ({selectedPaymentChain === "solana" ? "Solana" : "BSC"})</p>
              <p className="font-mono text-sm text-white break-all">
                {isPaymentConfigured(selectedPaymentChain) ? getPlatformWallet(selectedPaymentChain) : "未配置"}
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
                className={`flex-1 px-6 py-3 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  promoCodeValidated 
                    ? "bg-green-500 text-white hover:bg-green-600" 
                    : "bg-[#FF8C00] text-black hover:bg-[#FFAD33]"
                }`}
              >
                {promoCodeValidated 
                  ? "确认发掘（免费）" 
                  : `确认支付 $${discoveryFee.amount} ${stablecoinName}`}
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
            <p className="text-gray-400 mb-4">{promoCodeValidated ? "正在提交项目..." : "正在确认交易并提交项目"}</p>
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

      {/* 绑定钱包 Modal */}
      <ConnectWalletModal
        isOpen={showBindWalletModal}
        onClose={() => setShowBindWalletModal(false)}
        mode="bind"
        excludeChain={walletChain || undefined}
      />
    </main>
  );
}
