"use client";

import { useState } from "react";
import { useWallet, WalletType } from "@/lib/wallet/WalletProvider";

interface WalletOption {
  type: WalletType;
  name: string;
  icon: string;
  chain: string;
}

const walletOptions: WalletOption[] = [
  { type: "phantom", name: "Phantom", icon: "👻", chain: "Solana" },
  { type: "solflare", name: "Solflare", icon: "🔥", chain: "Solana" },
  { type: "metamask", name: "MetaMask", icon: "🦊", chain: "BSC" },
];

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connect, isConnecting } = useWallet();
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);

  const handleConnect = async (walletType: WalletType) => {
    setSelectedWallet(walletType);
    await connect(walletType);
    onClose();
  };

  if (!isOpen) return null;

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
          <h2 className="text-xl font-bold text-white">连接钱包</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {walletOptions.map((wallet) => (
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
                <p className="text-xs text-gray-400">{wallet.chain}</p>
              </div>
              {isConnecting && selectedWallet === wallet.type && (
                <div className="ml-auto">
                  <div className="w-5 h-5 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          连接钱包即表示您同意我们的服务条款
        </p>
      </div>
    </div>
  );
}

interface WalletButtonProps {
  collapsed?: boolean;
}

/**
 * 钱包按钮 - 显示在侧边栏底部
 */
export function WalletButton({ collapsed = false }: WalletButtonProps) {
  const { isConnected, address, chain, disconnect } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? `${chain === "solana" ? "Solana" : "BSC"}: ${address}` : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-[#FF8C00]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">{chain === "solana" ? "◎" : "🔶"}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs text-gray-400">{chain === "solana" ? "Solana" : "BSC"}</p>
              <p className="text-sm font-mono text-white truncate">{address}</p>
            </div>
          )}
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#111111] border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => {
                disconnect();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-[#EF4444] hover:bg-white/5 transition whitespace-nowrap"
            >
              断开连接
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`w-full px-4 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition flex items-center justify-center gap-2`}
        title={collapsed ? "连接钱包" : undefined}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        {!collapsed && <span>连接钱包</span>}
      </button>

      <ConnectWalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
