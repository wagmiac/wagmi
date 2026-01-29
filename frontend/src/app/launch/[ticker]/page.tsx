"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Sidebar, useSidebar } from "@/components/imo";
import { useMultiWallet } from "@/lib/wallet/MultiWalletProvider";
import { 
  Chain, 
  Launchpad, 
  CHAIN_CONFIG, 
  LAUNCHPAD_CONFIG,
  Project 
} from "@/types/imo";
import { getProjectByTicker, launchWithPayment, generateDevWallet, getDevWallet } from "@/lib/api/imo";

type LaunchStep = "loading" | "not-available" | "configure" | "launching" | "success";

export default function LaunchPage() {
  const params = useParams();
  const { sidebarWidth } = useSidebar();
  const { isAuthenticated, sendTransfer, getWalletByChain, connect } = useMultiWallet();
  
  const [step, setStep] = useState<LaunchStep>("loading");
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 发射配置
  const [selectedChain, setSelectedChain] = useState<Chain>("solana");
  const [selectedLaunchpad, setSelectedLaunchpad] = useState<Launchpad>("pump.fun");
  const [firstBuyAmount, setFirstBuyAmount] = useState<string>("0.1");
  const [devWalletAddress, setDevWalletAddress] = useState<string | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  // flap.sh 专属：税率选项（基点，100=1%, 300=3%）
  const [taxRate, setTaxRate] = useState<number>(0);
  
  // 发射结果
  const [launchResult, setLaunchResult] = useState<{
    tokenAddress: string;
    launchTxHash: string;
    tokenTransferTx: string;
    tokensReceived: number;
  } | null>(null);

  const ticker = params.ticker as string;

  // 获取当前链的配置
  const chainConfig = CHAIN_CONFIG[selectedChain];
  const currency = chainConfig.currency;
  const minFirstBuy = chainConfig.minFirstBuy;

  // 获取可用的发射台
  const availableLaunchpads = chainConfig.launchpads.map(lp => LAUNCHPAD_CONFIG[lp]);

  // 检查是否连接了当前链的钱包
  const currentWallet = getWalletByChain(selectedChain);
  const hasWalletForCurrentChain = !!currentWallet;

  // 加载项目信息
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await getProjectByTicker(ticker);
        if (res.success && res.data) {
          const proj = res.data as Project;
          setProject(proj);
          
          // 检查项目状态
          if (proj.token_address) {
            setError("该项目已发射代币，不能重复发射");
            setStep("not-available");
          } else if (proj.status !== "discovering" && proj.status !== "launching") {
            setError("该项目当前状态不可发射");
            setStep("not-available");
          } else if (!proj.logo) {
            setError("项目缺少 Logo 图片，请先在项目详情页上传图片");
            setStep("not-available");
          } else {
            // 设置默认链
            if (proj.chain) {
              setSelectedChain(proj.chain as Chain);
              const chainLaunchpads = CHAIN_CONFIG[proj.chain as Chain]?.launchpads;
              if (chainLaunchpads?.length) {
                setSelectedLaunchpad(chainLaunchpads[0]);
              }
            }
            setStep("configure");
          }
        } else {
          setError("项目不存在");
          setStep("not-available");
        }
      } catch {
        setError("加载项目失败");
        setStep("not-available");
      }
    }
    
    loadProject();
  }, [ticker]);

  // 当链改变时，更新发射台选择
  useEffect(() => {
    const chainLaunchpads = CHAIN_CONFIG[selectedChain]?.launchpads;
    if (chainLaunchpads?.length && !chainLaunchpads.includes(selectedLaunchpad)) {
      setSelectedLaunchpad(chainLaunchpads[0]);
    }
    // 更新最小金额
    setFirstBuyAmount(CHAIN_CONFIG[selectedChain].minFirstBuy.toString());
    // 重置 DevWallet（链或发射台改变时需要重新获取）
    setDevWalletAddress(null);
  }, [selectedChain, selectedLaunchpad]);

  // 当发射台改变时，获取或生成 DevWallet
  useEffect(() => {
    if (!project || step !== "configure") return;
    
    async function loadDevWallet() {
      setIsLoadingWallet(true);
      setError(null);
      try {
        // 先尝试获取已有的钱包
        let res = await getDevWallet(project!.id, selectedLaunchpad);
        
        if (res.success && res.data) {
          const walletData = res.data as { address?: string } | Record<string, { address?: string }>;
          // 可能返回单个钱包对象或所有钱包的 map
          const addr = (walletData as { address?: string }).address || 
                      (walletData as Record<string, { address?: string }>)[selectedLaunchpad]?.address;
          if (addr) {
            setDevWalletAddress(addr);
            setIsLoadingWallet(false);
            return;
          }
        }
        
        // 没有钱包，生成新的
        res = await generateDevWallet(project!.id, selectedLaunchpad);
        if (res.success && res.data) {
          const data = res.data as { address: string };
          setDevWalletAddress(data.address);
        } else {
          setError("获取收款地址失败：" + (res.error || res.message));
        }
      } catch (err) {
        console.error("Load dev wallet error:", err);
        setError("获取收款地址失败");
      } finally {
        setIsLoadingWallet(false);
      }
    }
    
    loadDevWallet();
  }, [project, selectedLaunchpad, step]);

  // 连接钱包
  async function handleConnectWallet() {
    if (selectedChain === "solana") {
      await connect("phantom");
    } else {
      await connect("metamask");
    }
  }

  // 发射：弹出钱包支付 -> 发送交易哈希给后端
  async function handleLaunch() {
    if (!project) return;
    
    const amount = parseFloat(firstBuyAmount);
    if (isNaN(amount) || amount < minFirstBuy) {
      setError(`最低首单金额为 ${minFirstBuy} ${currency}`);
      return;
    }

    if (!hasWalletForCurrentChain) {
      setError(`请先连接 ${selectedChain === "solana" ? "Phantom" : "MetaMask"} 钱包`);
      return;
    }

    if (!devWalletAddress) {
      setError("收款地址未就绪，请稍候再试");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 使用项目在该发射台的 DevWallet 作为收款地址
      const receiverAddress = devWalletAddress;
      
      // 弹出钱包进行转账
      const transferResult = await sendTransfer({
        to: receiverAddress,
        amount: amount,
        chain: selectedChain,
      });

      if (!transferResult.success) {
        setError(transferResult.error || "支付失败");
        setIsLoading(false);
        return;
      }

      // 使用实际转账的钱包地址（可能与存储的不同，因为用户可能切换了账户）
      const actualUserWallet = transferResult.fromAddress || currentWallet!.address;
      console.log("Payment successful, user wallet:", actualUserWallet);

      // 支付成功，调用后端发射接口
      setStep("launching");
      
      const res = await launchWithPayment(project.id, {
        chain: selectedChain,
        launchpad: selectedLaunchpad,
        firstBuyAmount: amount,
        userWallet: actualUserWallet,
        paymentTxHash: transferResult.txHash!,
        // flap.sh 税率（0=无税，100=1%，300=3%）
        taxRate: selectedLaunchpad === "flap.sh" ? taxRate : undefined,
      });

      if (res.success && res.data) {
        const data = res.data as {
          tokenAddress: string;
          launchTxHash: string;
          tokenTransferTx: string;
          tokensReceived: number;
        };
        setLaunchResult(data);
        setStep("success");
      } else {
        setError(res.error || res.message || "发射失败");
        setStep("configure");
      }
    } catch (err) {
      console.error("Launch error:", err);
      setError("发射失败，请重试");
      setStep("configure");
    } finally {
      setIsLoading(false);
    }
  }

  // 复制地址到剪贴板
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  // 渲染内容
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
        
      case "not-available":
        return (
          <div className="max-w-lg mx-auto py-20 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-white mb-4">无法发射</h2>
            <p className="text-gray-400 mb-6">{error || "无法访问发射页面"}</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition">
              返回首页
            </Link>
          </div>
        );
        
      case "configure":
        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">发射配置</h2>
              
              {project && (
                <div className="bg-white/5 rounded-lg p-4 mb-6 flex items-center gap-4">
                  {project.logo && (
                    <Image src={project.logo} alt={project.name} width={64} height={64} className="rounded-lg" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{project.name}</h3>
                    <p className="text-[#FF8C00] font-mono">{project.ticker}</p>
                    <p className="text-sm text-gray-400 line-clamp-1">{project.description}</p>
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">选择公链</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(CHAIN_CONFIG).map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => setSelectedChain(chain.id)}
                      className={`p-4 rounded-lg border transition flex items-center gap-3 ${
                        selectedChain === chain.id ? "border-[#FF8C00] bg-[#FF8C00]/10" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <Image src={chain.icon} alt={chain.name} width={32} height={32} className="rounded-full" />
                      <div className="text-left">
                        <p className="font-bold text-white">{chain.name}</p>
                        <p className="text-xs text-gray-400">{chain.currency}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">选择发射台</label>
                <div className="grid grid-cols-2 gap-3">
                  {availableLaunchpads.map((lp) => (
                    <button
                      key={lp.id}
                      onClick={() => setSelectedLaunchpad(lp.id)}
                      className={`p-4 rounded-lg border transition ${
                        selectedLaunchpad === lp.id ? "border-[#FF8C00] bg-[#FF8C00]/10" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <p className="font-bold text-white">{lp.name}</p>
                      <p className="text-xs text-gray-400">{lp.url}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* flap.sh 专属：税率设置 */}
              {selectedLaunchpad === "flap.sh" && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    交易税率（可选）
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 0, label: "无税" },
                      { value: 100, label: "1%" },
                      { value: 300, label: "3%" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTaxRate(option.value)}
                        className={`p-3 rounded-lg border transition text-center ${
                          taxRate === option.value 
                            ? "border-[#FF8C00] bg-[#FF8C00]/10 text-[#FF8C00]" 
                            : "border-white/10 text-gray-300 hover:border-white/30"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    交易税将自动转入项目开发钱包，用于持续发展
                  </p>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  首单购买金额（最低 {minFirstBuy} {currency}）
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={firstBuyAmount}
                    onChange={(e) => setFirstBuyAmount(e.target.value)}
                    min={minFirstBuy}
                    step="0.01"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-l-lg text-white focus:outline-none focus:border-[#FF8C00]"
                  />
                  <span className="px-4 py-3 bg-white/10 border border-l-0 border-white/10 rounded-r-lg text-gray-400">{currency}</span>
                </div>
              </div>

              {/* 钱包状态 */}
              {!isAuthenticated ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-400 text-sm mb-2">请先连接钱包</p>
                  <button
                    onClick={handleConnectWallet}
                    className="px-4 py-2 bg-yellow-500 text-black text-sm font-bold rounded-lg hover:bg-yellow-400 transition"
                  >
                    连接 {selectedChain === "solana" ? "Phantom" : "MetaMask"}
                  </button>
                </div>
              ) : !hasWalletForCurrentChain ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-400 text-sm mb-2">
                    请连接 {selectedChain === "solana" ? "Solana" : "BSC"} 链钱包
                  </p>
                  <button
                    onClick={handleConnectWallet}
                    className="px-4 py-2 bg-yellow-500 text-black text-sm font-bold rounded-lg hover:bg-yellow-400 transition"
                  >
                    连接 {selectedChain === "solana" ? "Phantom" : "MetaMask"}
                  </button>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-green-400 text-sm">已连接钱包</p>
                    <p className="text-white font-mono text-sm">
                      {currentWallet?.address.slice(0, 8)}...{currentWallet?.address.slice(-6)}
                    </p>
                  </div>
                  <span className="text-green-400">✓</span>
                </div>
              )}
              
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 mb-6">
                  <p className="text-[#EF4444] text-sm">{error}</p>
                </div>
              )}
              
              <button
                onClick={handleLaunch}
                disabled={isLoading || !firstBuyAmount || parseFloat(firstBuyAmount) < minFirstBuy || !hasWalletForCurrentChain}
                className="w-full py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "处理中..." : `🚀 发射 (支付 ${firstBuyAmount} ${currency})`}
              </button>
            </div>
          </div>
        );
        
      case "launching":
        return (
          <div className="max-w-lg mx-auto py-20">
            <div className="text-center">
              <div className="w-20 h-20 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">正在发射...</h2>
              <p className="text-gray-400 mb-2">正在创建 {project?.ticker} 代币</p>
              <p className="text-gray-500 text-sm">请勿关闭页面</p>
            </div>
          </div>
        );
        
      case "success":
        return (
          <div className="max-w-lg mx-auto py-10">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">发射成功！</h2>
              <p className="text-gray-400 mb-6">{project?.ticker} 已成功在 {LAUNCHPAD_CONFIG[selectedLaunchpad]?.name} 上发射</p>
              
              <div className="space-y-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">代币合约地址</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-white text-sm break-all flex-1">{launchResult?.tokenAddress}</p>
                    <button onClick={() => copyToClipboard(launchResult?.tokenAddress || "")} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">📋</button>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">获得代币数量</p>
                  <p className="text-2xl font-bold text-[#FF8C00]">{launchResult?.tokensReceived?.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Link href={`/${project?.ticker?.replace('$', '')}`} className="flex-1 py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition text-center">
                  查看项目
                </Link>
                <a href={LAUNCHPAD_CONFIG[selectedLaunchpad]?.url} target="_blank" rel="noopener noreferrer" className="flex-1 py-4 border border-white/10 text-white font-bold rounded-lg hover:bg-white/5 transition text-center">
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
      <main className="flex-1 transition-all duration-300" style={{ marginLeft: sidebarWidth }}>
        <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href={project ? `/${project.ticker?.replace('$', '')}` : "/"} className="text-gray-400 hover:text-white transition flex items-center gap-2">
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
        
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
