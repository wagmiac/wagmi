"use client";

import { useState } from "react";
import { useMultiWallet, WalletType, WalletConnection } from "@/lib/wallet/MultiWalletProvider";
import { Chain } from "@/types/imo";

interface WalletOption {
  type: WalletType;
  name: string;
  icon: string;
  chain: Chain;
  chainLabel: string;
}

const walletOptions: WalletOption[] = [
  { type: "phantom", name: "Phantom", icon: "👻", chain: "solana", chainLabel: "Solana" },
  { type: "solflare", name: "Solflare", icon: "🔥", chain: "solana", chainLabel: "Solana" },
  { type: "metamask", name: "MetaMask", icon: "🦊", chain: "bsc", chainLabel: "BSC" },
];

// 获取钱包图标
function getWalletIcon(walletType: WalletType): string {
  const option = walletOptions.find(w => w.type === walletType);
  return option?.icon || "💳";
}

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "connect" | "bind"; // 连接新钱包 or 绑定额外钱包
  excludeChain?: Chain; // 绑定时排除已连接的链
}

export function ConnectWalletModal({ isOpen, onClose, mode = "connect", excludeChain }: ConnectWalletModalProps) {
  const { connect, isConnecting, wallets } = useMultiWallet();
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);

  const handleConnect = async (walletType: WalletType) => {
    setSelectedWallet(walletType);
    await connect(walletType);
    onClose();
  };

  if (!isOpen) return null;

  // 过滤已连接的链
  const availableWallets = mode === "bind" && excludeChain
    ? walletOptions.filter(w => w.chain !== excludeChain)
    : walletOptions.filter(w => !wallets.some((cw: WalletConnection) => cw.chain === w.chain));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#111111] border border-white/10 rounded-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {mode === "bind" ? "绑定钱包" : "连接钱包"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === "bind" && (
          <p className="text-sm text-gray-400 mb-4">
            绑定另一条链的钱包以支持跨链支付
          </p>
        )}

        <div className="space-y-3">
          {availableWallets.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              所有链的钱包已连接
            </p>
          ) : (
            availableWallets.map((wallet) => (
              <button
                key={wallet.type}
                onClick={() => handleConnect(wallet.type)}
                disabled={isConnecting}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition ${
                  isConnecting && selectedWallet === wallet.type
                    ? "border-[#FF8C00] bg-[#FF8C00]/10"
                    : "border-white/10 hover:border-white/30 hover:bg-white/5"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-2xl">{wallet.icon}</span>
                <div className="text-left">
                  <p className="font-medium text-white">{wallet.name}</p>
                  <p className="text-xs text-gray-400">{wallet.chainLabel}</p>
                </div>
                {isConnecting && selectedWallet === wallet.type && (
                  <div className="ml-auto">
                    <div className="w-5 h-5 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          连接钱包即表示您同意我们的服务条款
        </p>
      </div>
    </div>
  );
}

// 单个已连接钱包显示
function ConnectedWalletItem({ 
  wallet, 
  onDisconnect,
  collapsed 
}: { 
  wallet: WalletConnection; 
  onDisconnect: () => void;
  collapsed: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? `${wallet.chain.toUpperCase()}: ${wallet.address}` : undefined}
      >
        <span className="text-lg">{getWalletIcon(wallet.walletType)}</span>
        {!collapsed && (
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">{wallet.chain.toUpperCase()}</span>
              {wallet.isPrimary && (
                <span className="text-[10px] px-1 bg-[#FF8C00]/20 text-[#FF8C00] rounded">主</span>
              )}
            </div>
            <p className="text-xs font-mono text-white truncate">{wallet.address}</p>
          </div>
        )}
      </button>

      {showMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#111111] border border-white/10 rounded-lg overflow-hidden z-10">
          <button
            onClick={() => {
              navigator.clipboard.writeText(wallet.address);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/5 transition"
          >
            复制地址
          </button>
          <button
            onClick={() => {
              onDisconnect();
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-[#EF4444] hover:bg-white/5 transition"
          >
            断开连接
          </button>
        </div>
      )}
    </div>
  );
}

interface WalletButtonProps {
  collapsed?: boolean;
}

/**
 * 钱包按钮 - 显示在侧边栏底部
 * 支持多钱包显示和绑定
 */
export function WalletButton({ collapsed = false }: WalletButtonProps) {
  const { wallets, primaryWallet, disconnectWallet } = useMultiWallet();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showBindModal, setShowBindModal] = useState(false);

  // 已连接钱包 - 显示钱包列表
  if (wallets.length > 0) {
    return (
      <div className="space-y-2">
        {/* 已连接的钱包列表 */}
        {wallets.map((wallet: WalletConnection) => (
          <ConnectedWalletItem
            key={`${wallet.chain}-${wallet.address}`}
            wallet={wallet}
            onDisconnect={() => disconnectWallet(wallet.chain)}
            collapsed={collapsed}
          />
        ))}

        {/* 绑定更多钱包按钮 */}
        {wallets.length < 2 && (
          <button
            onClick={() => setShowBindModal(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 border border-dashed border-white/20 rounded-lg hover:border-[#FF8C00]/50 hover:bg-white/5 transition text-gray-400 hover:text-[#FF8C00] ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? "绑定其他链钱包" : undefined}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {!collapsed && <span className="text-xs">绑定其他链</span>}
          </button>
        )}

        <ConnectWalletModal
          isOpen={showBindModal}
          onClose={() => setShowBindModal(false)}
          mode="bind"
          excludeChain={primaryWallet?.chain}
        />
      </div>
    );
  }

  // 未连接 - 显示连接按钮
  return (
    <>
      <button
        onClick={() => setShowConnectModal(true)}
        className={`w-full px-4 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition flex items-center justify-center gap-2`}
        title={collapsed ? "连接钱包" : undefined}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        {!collapsed && <span>连接钱包</span>}
      </button>

      <ConnectWalletModal 
        isOpen={showConnectModal} 
        onClose={() => setShowConnectModal(false)} 
        mode="connect"
      />
    </>
  );
}

/**
 * 简化版钱包状态显示 - 用于导航栏等位置
 */
export function WalletStatus() {
  const { wallets, primaryWallet } = useMultiWallet();
  const [showModal, setShowModal] = useState(false);

  if (wallets.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition text-sm"
        >
          连接钱包
        </button>
        <ConnectWalletModal isOpen={showModal} onClose={() => setShowModal(false)} mode="connect" />
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {wallets.map((wallet: WalletConnection) => (
        <div
          key={`${wallet.chain}-${wallet.address}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg"
          title={`${wallet.chain.toUpperCase()}: ${wallet.address}`}
        >
          <span className="text-sm">{getWalletIcon(wallet.walletType)}</span>
          <span className="text-xs font-mono text-gray-300">
            {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
          </span>
        </div>
      ))}
    </div>
  );
}
