"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Chain } from "@/types/imo";

/**
 * 钱包类型
 */
export type WalletType = "phantom" | "solflare" | "metamask";

/**
 * 单个钱包连接信息
 */
export interface WalletConnection {
  address: string;
  chain: Chain;
  walletType: WalletType;
  isPrimary: boolean; // 是否是主钱包（首次登录的）
  connectedAt: number;
}

/**
 * 多钱包状态
 */
export interface MultiWalletState {
  isAuthenticated: boolean; // 是否已登录（至少连接了一个钱包）
  isConnecting: boolean;
  primaryWallet: WalletConnection | null; // 主钱包
  wallets: WalletConnection[]; // 所有已连接的钱包
  activeChain: Chain | null; // 当前激活的链
}

/**
 * 转账参数
 */
export interface TransferParams {
  to: string;           // 接收地址
  amount: number;       // 金额（SOL 或 BNB）
  chain: Chain;         // 链
}

/**
 * 转账结果
 */
export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * 多钱包上下文类型
 */
interface MultiWalletContextType extends MultiWalletState {
  // 连接钱包
  connect: (walletType: WalletType) => Promise<void>;
  // 断开指定钱包
  disconnectWallet: (chain: Chain) => void;
  // 断开所有钱包（登出）
  disconnectAll: () => void;
  // 获取指定链的钱包
  getWalletByChain: (chain: Chain) => WalletConnection | null;
  // 切换激活的链
  setActiveChain: (chain: Chain) => void;
  // 签名消息
  signMessage: (message: string, chain?: Chain) => Promise<string | null>;
  // 发送转账交易
  sendTransfer: (params: TransferParams) => Promise<TransferResult>;
  // 检查是否已连接指定链的钱包
  hasWalletForChain: (chain: Chain) => boolean;
  // 获取当前激活链的地址
  activeAddress: string | null;
}

const MultiWalletContext = createContext<MultiWalletContextType | null>(null);

// 本地存储 key
const STORAGE_KEY = "wagmi_wallets";

/**
 * 多钱包 Provider
 */
export function MultiWalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MultiWalletState>({
    isAuthenticated: false,
    isConnecting: false,
    primaryWallet: null,
    wallets: [],
    activeChain: null,
  });

  // 从本地存储恢复钱包状态
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as { wallets: WalletConnection[]; activeChain: Chain | null };
        if (data.wallets && data.wallets.length > 0) {
          const primary = data.wallets.find((w) => w.isPrimary) || data.wallets[0];
          setState({
            isAuthenticated: true,
            isConnecting: false,
            primaryWallet: primary,
            wallets: data.wallets,
            activeChain: data.activeChain || primary.chain,
          });
        }
      }
    } catch (e) {
      console.error("Failed to restore wallet state:", e);
    }
  }, []);

  // 保存钱包状态到本地存储
  const saveToStorage = useCallback((wallets: WalletConnection[], activeChain: Chain | null) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ wallets, activeChain }));
    } catch (e) {
      console.error("Failed to save wallet state:", e);
    }
  }, []);

  /**
   * 连接钱包
   */
  const connect = useCallback(async (walletType: WalletType) => {
    setState((prev) => ({ ...prev, isConnecting: true }));

    try {
      let address: string | null = null;
      let chain: Chain;

      if (walletType === "phantom" || walletType === "solflare") {
        chain = "solana";
        const solana = (window as WindowWithSolana).solana;
        
        if (solana?.isPhantom || solana?.isSolflare) {
          const response = await solana.connect();
          address = response.publicKey.toString();
        } else {
          // Mock for development
          address = `${Math.random().toString(36).substring(2, 8)}...${Math.random().toString(36).substring(2, 6)}`;
        }
      } else if (walletType === "metamask") {
        chain = "bsc";
        const ethereum = (window as WindowWithEthereum).ethereum;
        
        if (ethereum?.isMetaMask) {
          const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[];
          if (accounts && accounts.length > 0) {
            address = accounts[0];
          }
        } else {
          // Mock for development
          address = `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`;
        }
      } else {
        throw new Error("Unknown wallet type");
      }

      if (!address) {
        throw new Error("Failed to get address");
      }

      setState((prev) => {
        // 检查是否已经连接了这个链的钱包
        const existingIndex = prev.wallets.findIndex((w) => w.chain === chain);
        
        const newWallet: WalletConnection = {
          address,
          chain,
          walletType,
          isPrimary: prev.wallets.length === 0, // 第一个连接的是主钱包
          connectedAt: Date.now(),
        };

        let newWallets: WalletConnection[];
        if (existingIndex >= 0) {
          // 替换已有的钱包
          newWallets = [...prev.wallets];
          newWallets[existingIndex] = { ...newWallet, isPrimary: prev.wallets[existingIndex].isPrimary };
        } else {
          // 添加新钱包
          newWallets = [...prev.wallets, newWallet];
        }

        const primary = newWallets.find((w) => w.isPrimary) || newWallets[0];
        
        saveToStorage(newWallets, chain);

        return {
          isAuthenticated: true,
          isConnecting: false,
          primaryWallet: primary,
          wallets: newWallets,
          activeChain: chain,
        };
      });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setState((prev) => ({ ...prev, isConnecting: false }));
    }
  }, [saveToStorage]);

  /**
   * 断开指定链的钱包
   */
  const disconnectWallet = useCallback((chain: Chain) => {
    setState((prev) => {
      const newWallets = prev.wallets.filter((w) => w.chain !== chain);
      
      if (newWallets.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return {
          isAuthenticated: false,
          isConnecting: false,
          primaryWallet: null,
          wallets: [],
          activeChain: null,
        };
      }

      // 如果断开的是主钱包，把第一个设为主钱包
      const wasPrimary = prev.wallets.find((w) => w.chain === chain)?.isPrimary;
      if (wasPrimary && newWallets.length > 0) {
        newWallets[0].isPrimary = true;
      }

      const primary = newWallets.find((w) => w.isPrimary) || newWallets[0];
      const newActiveChain = prev.activeChain === chain ? primary.chain : prev.activeChain;
      
      saveToStorage(newWallets, newActiveChain);

      return {
        ...prev,
        primaryWallet: primary,
        wallets: newWallets,
        activeChain: newActiveChain,
      };
    });
  }, [saveToStorage]);

  /**
   * 断开所有钱包
   */
  const disconnectAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      isAuthenticated: false,
      isConnecting: false,
      primaryWallet: null,
      wallets: [],
      activeChain: null,
    });
  }, []);

  /**
   * 获取指定链的钱包
   */
  const getWalletByChain = useCallback((chain: Chain): WalletConnection | null => {
    return state.wallets.find((w) => w.chain === chain) || null;
  }, [state.wallets]);

  /**
   * 切换激活的链
   */
  const setActiveChain = useCallback((chain: Chain) => {
    setState((prev) => {
      saveToStorage(prev.wallets, chain);
      return { ...prev, activeChain: chain };
    });
  }, [saveToStorage]);

  /**
   * 检查是否有指定链的钱包
   */
  const hasWalletForChain = useCallback((chain: Chain): boolean => {
    return state.wallets.some((w) => w.chain === chain);
  }, [state.wallets]);

  /**
   * 获取当前激活链的地址
   */
  const activeAddress = state.activeChain
    ? state.wallets.find((w) => w.chain === state.activeChain)?.address || null
    : state.primaryWallet?.address || null;

  /**
   * 签名消息
   */
  const signMessage = useCallback(async (message: string, chain?: Chain): Promise<string | null> => {
    const targetChain = chain || state.activeChain;
    if (!targetChain) return null;

    const wallet = state.wallets.find((w) => w.chain === targetChain);
    if (!wallet) return null;

    try {
      if (wallet.chain === "solana") {
        const solana = (window as WindowWithSolana).solana;
        if (solana) {
          const encodedMessage = new TextEncoder().encode(message);
          const signedMessage = await solana.signMessage(encodedMessage, "utf8");
          return Buffer.from(signedMessage.signature).toString("base64");
        }
      } else if (wallet.chain === "bsc") {
        const ethereum = (window as WindowWithEthereum).ethereum;
        if (ethereum && wallet.address) {
          const signature = await ethereum.request({
            method: "personal_sign",
            params: [message, wallet.address],
          });
          return signature as string;
        }
      }

      // Mock 签名
      return "mock_signature_" + Date.now();
    } catch (error) {
      console.error("Failed to sign message:", error);
      return null;
    }
  }, [state.activeChain, state.wallets]);

  /**
   * 发送转账交易
   */
  const sendTransfer = useCallback(async (params: TransferParams): Promise<TransferResult> => {
    const wallet = state.wallets.find((w) => w.chain === params.chain);
    if (!wallet) {
      return { success: false, error: "未连接对应链的钱包" };
    }

    try {
      if (params.chain === "solana") {
        const solana = (window as WindowWithSolana).solana;
        if (!solana) {
          return { success: false, error: "未找到 Solana 钱包" };
        }

        // 动态导入 @solana/web3.js
        const { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } = await import("@solana/web3.js");
        
        // 创建转账交易
        const fromPubkey = new PublicKey(wallet.address);
        const toPubkey = new PublicKey(params.to);
        const lamports = Math.floor(params.amount * LAMPORTS_PER_SOL);
        
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          })
        );
        
        // 设置 feePayer
        transaction.feePayer = fromPubkey;
        
        // 获取 recentBlockhash - 使用公共 RPC（只读取 blockhash，负载很低）
        // Phantom 的 signAndSendTransaction 仍需要有 recentBlockhash
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        
        // 使用 Phantom 的 signAndSendTransaction
        // Phantom 会使用自己的 RPC 发送交易（避免我们的 RPC 限流）
        if (solana.signAndSendTransaction) {
          const { signature } = await solana.signAndSendTransaction(transaction);
          return { success: true, txHash: signature };
        } else {
          // 旧版 Phantom 降级处理
          const signed = await solana.signTransaction(transaction);
          const txHash = await connection.sendRawTransaction(signed.serialize());
          return { success: true, txHash };
        }
      } else if (params.chain === "bsc") {
        const ethereum = (window as WindowWithEthereum).ethereum;
        if (!ethereum) {
          return { success: false, error: "未找到 MetaMask 钱包" };
        }

        // 检查并切换到 BSC 网络
        const BSC_CHAIN_ID = "0x38"; // 56 in decimal
        try {
          const currentChainId = await ethereum.request({ method: "eth_chainId" }) as string;
          if (currentChainId !== BSC_CHAIN_ID) {
            // 尝试切换到 BSC
            try {
              await ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: BSC_CHAIN_ID }],
              });
            } catch (switchError: unknown) {
              const err = switchError as { code?: number };
              // 如果 BSC 网络未添加，则添加
              if (err?.code === 4902) {
                await ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [{
                    chainId: BSC_CHAIN_ID,
                    chainName: "BNB Smart Chain",
                    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                    rpcUrls: ["https://bsc-dataseed.binance.org/"],
                    blockExplorerUrls: ["https://bscscan.com/"],
                  }],
                });
              } else {
                throw switchError;
              }
            }
          }
        } catch (networkError) {
          console.error("Network switch error:", networkError);
          return { success: false, error: "请在 MetaMask 中切换到 BSC 网络" };
        }

        // 将 BNB 转换为 Wei（1 BNB = 10^18 Wei）
        const weiAmount = BigInt(Math.floor(params.amount * 1e18));
        const hexAmount = "0x" + weiAmount.toString(16);

        console.log("BSC transfer params:", {
          from: wallet.address,
          to: params.to,
          value: hexAmount,
          amount: params.amount,
        });

        // 发送交易
        try {
          const txHash = await ethereum.request({
            method: "eth_sendTransaction",
            params: [{
              from: wallet.address,
              to: params.to,
              value: hexAmount,
            }],
          }) as string;

          console.log("BSC transaction hash:", txHash);
          return { success: true, txHash };
        } catch (txError: unknown) {
          console.error("BSC eth_sendTransaction error:", txError);
          const err = txError as { message?: string; code?: number; reason?: string };
          if (err?.code === 4001) {
            return { success: false, error: "用户取消了交易" };
          }
          if (err?.code === -32000 || err?.message?.includes("insufficient funds")) {
            return { success: false, error: "钱包 BNB 余额不足" };
          }
          return { success: false, error: err?.message || "BSC 交易失败" };
        }
      }

      return { success: false, error: "不支持的链" };
    } catch (error: unknown) {
      // 详细打印错误信息用于调试
      console.error("Failed to send transfer:", error);
      console.error("Error type:", typeof error);
      console.error("Error JSON:", JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
      
      let errorMessage = "转账失败";
      
      // MetaMask/钱包返回的错误可能是对象而不是 Error 实例
      const err = error as { message?: string; code?: number; reason?: string; data?: { message?: string } };
      const msg = err?.message || err?.reason || err?.data?.message || (typeof error === 'string' ? error : '');
      
      if (msg) {
        // 解析常见错误
        if (msg.includes("insufficient lamports")) {
          const match = msg.match(/insufficient lamports (\d+), need (\d+)/);
          if (match) {
            const hasSOL = (parseInt(match[1]) / 1e9).toFixed(4);
            const needSOL = (parseInt(match[2]) / 1e9).toFixed(4);
            errorMessage = `钱包余额不足。当前: ${hasSOL} SOL，需要: ${needSOL} SOL`;
          } else {
            errorMessage = "钱包余额不足，请充值后重试";
          }
        } else if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("User denied") || err?.code === 4001) {
          errorMessage = "用户取消了交易";
        } else if (msg.includes("insufficient funds")) {
          errorMessage = "钱包余额不足，请充值后重试";
        } else {
          errorMessage = msg;
        }
      } else if (err?.code === 4001) {
        errorMessage = "用户取消了交易";
      } else if (err?.code === -32000) {
        errorMessage = "钱包余额不足，请充值后重试";
      }
      
      return { success: false, error: errorMessage };
    }
  }, [state.wallets]);

  return (
    <MultiWalletContext.Provider
      value={{
        ...state,
        activeAddress,
        connect,
        disconnectWallet,
        disconnectAll,
        getWalletByChain,
        setActiveChain,
        signMessage,
        sendTransfer,
        hasWalletForChain,
      }}
    >
      {children}
    </MultiWalletContext.Provider>
  );
}

/**
 * 使用多钱包 Hook
 */
export function useMultiWallet() {
  const context = useContext(MultiWalletContext);
  if (!context) {
    throw new Error("useMultiWallet must be used within a MultiWalletProvider");
  }
  return context;
}

// 兼容旧的 useWallet hook（平滑迁移）
export function useWallet() {
  const multi = useMultiWallet();
  
  return {
    isConnected: multi.isAuthenticated,
    isConnecting: multi.isConnecting,
    address: multi.activeAddress,
    // 主钱包地址（用于"我的"页面等需要用户标识的场景）
    primaryAddress: multi.primaryWallet?.address || null,
    // 所有已连接钱包的地址列表
    allAddresses: multi.wallets.map(w => w.address),
    chain: multi.activeChain,
    walletType: multi.primaryWallet?.walletType || null,
    connect: multi.connect,
    disconnect: multi.disconnectAll,
    switchChain: multi.setActiveChain,
    signMessage: multi.signMessage,
  };
}

// 类型定义
interface WindowWithSolana extends Window {
  solana?: {
    isPhantom?: boolean;
    isSolflare?: boolean;
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
  };
}

interface WindowWithEthereum extends Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
}
