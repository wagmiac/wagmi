"use client";

import { useState } from "react";
import { Project, Chain, Launchpad, CHAIN_CONFIG, LAUNCHPAD_CONFIG } from "@/types/imo";
import { useMultiWallet } from "@/lib/wallet/MultiWalletProvider";
import { launchWithPayment, generateDevWallet } from "@/lib/api/imo";

interface TokenListProps {
  project: Project;
}

// 所有发射台列表（trends.fun 暂时隐藏，等对接完成后再加回来）
const ALL_LAUNCHPADS: Launchpad[] = ['pump.fun', 'bags.fm', 'four.meme', 'flap.sh'];

// 发射台 logo 映射
const LAUNCHPAD_LOGOS: Record<Launchpad, string> = {
  'pump.fun': '/pumpfun.webp',
  'trends.fun': '/trends-logo.png',
  'bags.fm': '/bagsfm.png',
  'four.meme': '/fourmeme.svg',
  'flap.sh': '/flapsh.webp',
};

export function TokenList({ project }: TokenListProps) {
  const { isAuthenticated, sendTransfer, getWalletByChain, connect } = useMultiWallet();
  
  // 发射状态
  const [launchingPad, setLaunchingPad] = useState<Launchpad | null>(null);
  const [showBuyInput, setShowBuyInput] = useState<Launchpad | null>(null);
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(0); // flap.sh 税率（基点，100=1%）
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // 获取已发射的发射台列表（支持多个）
  const launchedPads = project.launched_pads || [];
  const tokenAddresses = project.token_addresses || {};
  
  // 兼容旧数据：如果有 launchpad 字段但没有 launched_pads
  const legacyLaunchpad = project.launchpad as Launchpad | undefined;
  const isLegacyLaunched = legacyLaunchpad && !launchedPads.includes(legacyLaunchpad);
  
  // 检查发射台是否已发射
  const isLaunchpadLaunched = (launchpad: Launchpad): boolean => {
    if (launchedPads.includes(launchpad)) return true;
    if (legacyLaunchpad === launchpad) return true;
    return false;
  };
  
  // 获取发射台的代币地址
  const getTokenAddress = (launchpad: Launchpad): string | undefined => {
    if (tokenAddresses[launchpad]) return tokenAddresses[launchpad];
    if (legacyLaunchpad === launchpad) return project.token_address;
    return undefined;
  };

  // 统计已发射数量
  const launchedCount = launchedPads.length + (isLegacyLaunched ? 1 : 0);

  // 获取发射台对应的链
  const getChainForLaunchpad = (launchpad: Launchpad): Chain => {
    return LAUNCHPAD_CONFIG[launchpad].chain;
  };

  // 检查钱包连接
  const checkWalletForChain = (chain: Chain): boolean => {
    const wallet = getWalletByChain(chain);
    return !!wallet;
  };

  // 连接钱包
  const handleConnectWallet = async (chain: Chain) => {
    if (chain === "solana") {
      await connect("phantom");
    } else {
      await connect("metamask");
    }
  };

  // 开始发射流程
  const handleStartLaunch = (launchpad: Launchpad) => {
    const chain = getChainForLaunchpad(launchpad);
    const chainConfig = CHAIN_CONFIG[chain];
    setBuyAmount(chainConfig.minFirstBuy.toString());
    setTaxRate(0); // 重置税率
    setShowBuyInput(launchpad);
    setError(null);
  };

  // 取消发射
  const handleCancelLaunch = () => {
    setShowBuyInput(null);
    setBuyAmount("");
    setTaxRate(0);
    setError(null);
  };

  // 执行发射
  const handleLaunch = async (launchpad: Launchpad) => {
    const chain = getChainForLaunchpad(launchpad);
    const chainConfig = CHAIN_CONFIG[chain];
    const wallet = getWalletByChain(chain);
    
    // 检查项目是否有 Logo
    if (!project.logo) {
      setError("项目缺少 Logo 图片，请先上传图片");
      return;
    }
    
    if (!wallet) {
      setError(`请先连接 ${chain === "solana" ? "Phantom" : "MetaMask"} 钱包`);
      return;
    }

    const amount = parseFloat(buyAmount);
    if (isNaN(amount) || amount < chainConfig.minFirstBuy) {
      setError(`最低首单金额为 ${chainConfig.minFirstBuy} ${chainConfig.currency}`);
      return;
    }

    setIsProcessing(true);
    setLaunchingPad(launchpad);
    setError(null);

    try {
      // 获取该发射台对应的 dev 钱包地址
      const launchpadWallets = project.launchpad_wallets || {};
      let receiverAddress = launchpadWallets[launchpad];
      
      // 注意：不要 fallback 到 dev_wallet_address，因为那是单链（Solana）地址
      // 每个发射台必须有自己对应链的钱包
      
      // 如果没有钱包，自动生成
      if (!receiverAddress) {
        console.log(`生成 ${launchpad} 的 Dev 钱包...`);
        const walletRes = await generateDevWallet(project.id, launchpad);
        if (!walletRes.success || !walletRes.data?.address) {
          setError(`生成 Dev 钱包失败: ${walletRes.error || '未知错误'}`);
          setIsProcessing(false);
          setLaunchingPad(null);
          return;
        }
        receiverAddress = walletRes.data.address;
        console.log(`Dev 钱包已生成: ${receiverAddress}`);
      }
      
      // 弹出钱包进行转账
      const transferResult = await sendTransfer({
        to: receiverAddress,
        amount: amount,
        chain: chain,
      });

      if (!transferResult.success) {
        setError(transferResult.error || "支付失败");
        setIsProcessing(false);
        setLaunchingPad(null);
        // 保持输入框打开以显示错误
        return;
      }

      // 使用实际转账的钱包地址（可能与存储的不同，因为用户可能切换了账户）
      const actualUserWallet = transferResult.fromAddress || wallet.address;
      console.log("Payment successful, user wallet:", actualUserWallet);

      // 支付成功，调用后端发射接口
      const res = await launchWithPayment(project.id, {
        chain: chain,
        launchpad: launchpad,
        firstBuyAmount: amount,
        userWallet: actualUserWallet,
        paymentTxHash: transferResult.txHash!,
        // flap.sh 专属：税率
        taxRate: launchpad === 'flap.sh' ? taxRate : undefined,
      });

      if (res.success) {
        // 发射成功，刷新页面
        window.location.reload();
      } else {
        setError(res.error || res.message || "发射失败");
        setIsProcessing(false);
        setLaunchingPad(null);
        // 保持输入框打开以显示错误
        return;
      }
    } catch (err: unknown) {
      console.error("Launch error:", err);
      // 提取错误信息
      let errorMsg = "发射失败，请重试";
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "string") {
        errorMsg = err;
      }
      // 简化常见错误提示
      if (errorMsg.includes("insufficient lamports")) {
        const match = errorMsg.match(/insufficient lamports (\d+), need (\d+)/);
        if (match) {
          const hasSOL = (parseInt(match[1]) / 1e9).toFixed(4);
          const needSOL = (parseInt(match[2]) / 1e9).toFixed(4);
          errorMsg = `钱包余额不足。当前: ${hasSOL} SOL，需要: ${needSOL} SOL`;
        } else {
          errorMsg = "钱包余额不足，请充值后重试";
        }
      } else if (errorMsg.includes("User rejected")) {
        errorMsg = "用户取消了交易";
      }
      setError(errorMsg);
      setIsProcessing(false);
      setLaunchingPad(null);
      // 保持输入框打开以显示错误
    }
  };

  // 渲染发射台卡片
  const renderLaunchpadCard = (launchpad: Launchpad) => {
    const config = LAUNCHPAD_CONFIG[launchpad];
    const chain = config.chain;
    const chainConfig = CHAIN_CONFIG[chain];
    const isLaunched = isLaunchpadLaunched(launchpad);
    const tokenAddress = getTokenAddress(launchpad);
    const isLaunching = launchingPad === launchpad;
    const showInput = showBuyInput === launchpad;
    const hasWallet = checkWalletForChain(chain);

    return (
      <div 
        key={launchpad}
        className={`bg-white/5 border rounded-xl p-4 transition ${
          isLaunched 
            ? "border-[#10B981]/50 bg-[#10B981]/5" 
            : "border-white/10 hover:border-white/20"
        }`}
      >
        {/* Header: 发射台 logo + 名称 */}
        <div className="flex items-center gap-2 mb-3">
          <img 
            src={LAUNCHPAD_LOGOS[launchpad]} 
            alt={config.name} 
            className="w-5 h-5 rounded-sm object-contain" 
          />
          <span className="font-medium text-white">{config.name}</span>
        </div>

        {/* 已发射状态 */}
        {isLaunched && tokenAddress && (
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#10B981]/20 text-[#10B981] text-xs rounded mb-3">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              已发射
            </div>
            
            {/* 合约地址 */}
            <div className="flex items-center gap-2 mb-3 bg-black/20 rounded-lg px-3 py-2">
              <code className="text-xs text-[#00E5FF] font-mono flex-1 truncate">
                {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tokenAddress);
                  setCopiedAddress(tokenAddress);
                  setTimeout(() => setCopiedAddress(null), 2000);
                }}
                className="p-1 hover:bg-white/10 rounded transition flex-shrink-0"
                title="复制地址"
              >
                {copiedAddress === tokenAddress ? (
                  <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              {copiedAddress === tokenAddress && (
                <span className="text-xs text-[#10B981] animate-fade-in">已复制</span>
              )}
            </div>

            {/* 市场链接 */}
            <div className="flex gap-2">
              {chain === 'solana' ? (
                <>
                  <a
                    href={`https://axiom.trade/t/${tokenAddress}/@wagmiac1?chain=sol`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 bg-white/10 text-gray-300 text-xs font-medium rounded-lg hover:bg-white/20 transition text-center"
                  >
                    Axiom
                  </a>
                  <a
                    href={`https://gmgn.ai/sol/token/ZWZjVvEH_${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 bg-white/10 text-gray-300 text-xs font-medium rounded-lg hover:bg-white/20 transition text-center"
                  >
                    GMGN
                  </a>
                  <a
                    href={`https://web3.binance.com/token/sol/${tokenAddress}?ref=WALIBOT`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 bg-white/10 text-gray-300 text-xs font-medium rounded-lg hover:bg-white/20 transition text-center"
                  >
                    Binance
                  </a>
                </>
              ) : (
                <>
                  <a
                    href={`https://axiom.trade/t/${tokenAddress}/@wagmiac1?chain=bnb`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 bg-white/10 text-gray-300 text-xs font-medium rounded-lg hover:bg-white/20 transition text-center"
                  >
                    Axiom
                  </a>
                  <a
                    href={`https://gmgn.ai/bsc/token/ZWZjVvEH_${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 bg-white/10 text-gray-300 text-xs font-medium rounded-lg hover:bg-white/20 transition text-center"
                  >
                    GMGN
                  </a>
                  <a
                    href={`https://web3.binance.com/token/bsc/${tokenAddress}?ref=WALIBOT`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 bg-white/10 text-gray-300 text-xs font-medium rounded-lg hover:bg-white/20 transition text-center"
                  >
                    Binance
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {/* 未发射：显示链名称 + 按钮 */}
        {!isLaunched && !showInput && !isLaunching && (
          <div>
            <div className="text-xs text-gray-500 mb-3">{chainConfig.name}</div>
            {!isAuthenticated || !hasWallet ? (
              <button
                onClick={() => handleConnectWallet(chain)}
                className="w-full px-3 py-2 bg-white/10 text-gray-300 text-xs font-medium rounded-lg hover:bg-white/20 transition"
              >
                连接钱包
              </button>
            ) : (
              <button
                onClick={() => handleStartLaunch(launchpad)}
                className="w-full px-3 py-2 bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/30 text-xs font-medium rounded-lg hover:bg-[#FF8C00]/25 hover:border-[#FF8C00]/50 transition"
              >
                🚀 发射
              </button>
            )}
          </div>
        )}

        {/* 显示购买金额输入框 */}
        {showInput && !isLaunching && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                min={chainConfig.minFirstBuy}
                step="0.01"
                placeholder={`最低 ${chainConfig.minFirstBuy}`}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#FF8C00]"
              />
              <span className="text-xs text-gray-400">{chainConfig.currency}</span>
            </div>
            {/* flap.sh 专属：税率选择 */}
            {launchpad === 'flap.sh' && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">交易税率</p>
                <div className="flex gap-1">
                  {[
                    { value: 0, label: "无税" },
                    { value: 100, label: "1%" },
                    { value: 300, label: "3%" },
                    { value: 500, label: "5%" },
                    { value: 1000, label: "10%" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTaxRate(opt.value)}
                      className={`flex-1 px-1 py-1.5 text-xs rounded transition ${
                        taxRate === opt.value
                          ? "bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00]/50"
                          : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && showBuyInput === launchpad && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCancelLaunch}
                className="flex-1 px-3 py-2 bg-white/10 text-gray-300 text-xs rounded-lg hover:bg-white/20 transition"
              >
                取消
              </button>
              <button
                onClick={() => handleLaunch(launchpad)}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00]/30 text-xs font-medium rounded-lg hover:bg-[#FF8C00]/30 transition disabled:opacity-50"
              >
                支付
              </button>
            </div>
          </div>
        )}

        {/* 发射中 */}
        {isLaunching && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="w-4 h-4 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#FF8C00]">发射中...</span>
          </div>
        )}
      </div>
    );
  };

  // 按链分组
  const solanaLaunchpads = ALL_LAUNCHPADS.filter(lp => LAUNCHPAD_CONFIG[lp].chain === 'solana');
  const bscLaunchpads = ALL_LAUNCHPADS.filter(lp => LAUNCHPAD_CONFIG[lp].chain === 'bsc');

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span className="text-lg">🪙</span>
          代币信息
        </h3>
        {launchedCount > 0 && (
          <span className="text-xs text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded">
            已发射 {launchedCount} 个代币
          </span>
        )}
      </div>
      
      {/* Solana 发射台网格 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <ChainIcon chain="solana" />
          <span className="text-sm text-gray-400">Solana</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {solanaLaunchpads.map(renderLaunchpadCard)}
        </div>
      </div>

      {/* BSC 发射台网格 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ChainIcon chain="bsc" />
          <span className="text-sm text-gray-400">BSC</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {bscLaunchpads.map(renderLaunchpadCard)}
        </div>
      </div>
    </div>
  );
}

// 链图标组件
function ChainIcon({ chain }: { chain: Chain }) {
  const iconPath = chain === 'solana' ? '/chains/solana.svg' : '/chains/bsc.svg';
  return (
    <img 
      src={iconPath} 
      alt={chain} 
      className="w-4 h-4" 
    />
  );
}

export default TokenList;
