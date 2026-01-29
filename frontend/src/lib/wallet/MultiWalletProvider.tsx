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
  fromAddress?: string; // 实际使用的发送地址（可能与存储的不同）
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

  // 从本地存储恢复钱包状态，并尝试重新连接
  useEffect(() => {
    const restoreAndReconnect = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored) as { wallets: WalletConnection[]; activeChain: Chain | null };
          if (data.wallets && data.wallets.length > 0) {
            const primary = data.wallets.find((w) => w.isPrimary) || data.wallets[0];
            
            // 先恢复状态显示
            setState({
              isAuthenticated: true,
              isConnecting: false,
              primaryWallet: primary,
              wallets: data.wallets,
              activeChain: data.activeChain || primary.chain,
            });
            
            // 尝试静默重连各个钱包以获取签名权限
            for (const wallet of data.wallets) {
              try {
                if (wallet.chain === 'solana') {
                  const solana = (window as WindowWithSolana).solana;
                  if (solana?.isPhantom || solana?.isSolflare) {
                    // 使用 onlyIfTrusted 尝试静默连接
                    await solana.connect({ onlyIfTrusted: true });
                  }
                } else if (wallet.chain === 'bsc') {
                  const ethereum = (window as WindowWithEthereum).ethereum;
                  if (ethereum?.isMetaMask) {
                    // MetaMask 会自动保持连接状态
                    await ethereum.request({ method: 'eth_accounts' });
                  }
                }
              } catch (e) {
                console.log(`Silent reconnect for ${wallet.chain} failed, user may need to reconnect manually`);
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to restore wallet state:", e);
      }
    };
    
    restoreAndReconnect();
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
    if (!targetChain) {
      console.error("signMessage: No target chain specified");
      return null;
    }

    const wallet = state.wallets.find((w) => w.chain === targetChain);
    if (!wallet) {
      console.error("signMessage: No wallet found for chain", targetChain);
      return null;
    }

    try {
      if (wallet.chain === "solana") {
        const solana = (window as WindowWithSolana).solana;
        if (!solana) {
          console.error("signMessage: Solana wallet not found in window");
          throw new Error("钱包未安装或未授权");
        }
        
        // 确保钱包已连接
        if (!solana.isConnected) {
          console.log("signMessage: Wallet not connected, reconnecting...");
          await solana.connect();
        }
        
        console.log("signMessage: Requesting signature for Solana wallet...");
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await solana.signMessage(encodedMessage, "utf8");
        console.log("signMessage: Signature received");
        return Buffer.from(signedMessage.signature).toString("base64");
      } else if (wallet.chain === "bsc") {
        const ethereum = (window as WindowWithEthereum).ethereum;
        if (ethereum && wallet.address) {
          console.log("signMessage: Requesting signature for BSC wallet...");
          const signature = await ethereum.request({
            method: "personal_sign",
            params: [message, wallet.address],
          });
          console.log("signMessage: Signature received");
          return signature as string;
        }
      }

      // Mock 签名
      return "mock_signature_" + Date.now();
    } catch (error) {
      console.error("Failed to sign message:", error);
      // 重新抛出错误，让调用者知道发生了什么
      throw error;
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

    // 确保钱包已授权签名权限
    try {
      if (params.chain === 'solana') {
        const solana = (window as WindowWithSolana).solana;
        if (solana?.isPhantom || solana?.isSolflare) {
          // 检查连接状态，如果未连接则重新连接
          if (!solana.isConnected) {
            console.log("Solana wallet not connected, reconnecting...");
            await solana.connect();
          }
        }
      } else if (params.chain === 'bsc') {
        const ethereum = (window as WindowWithEthereum).ethereum;
        if (ethereum?.isMetaMask) {
          // 确保账户已授权
          const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
          if (!accounts || accounts.length === 0) {
            console.log("MetaMask not authorized, requesting accounts...");
            await ethereum.request({ method: 'eth_requestAccounts' });
          }
        }
      }
    } catch (reconnectError) {
      console.error("Failed to reconnect wallet:", reconnectError);
      return { success: false, error: "钱包连接已断开，请重新连接钱包" };
    }

    try {
      if (params.chain === "solana") {
        const solana = (window as WindowWithSolana).solana;
        if (!solana) {
          return { success: false, error: "未找到 Solana 钱包" };
        }

        // 检查钱包是否已连接
        if (!solana.isConnected) {
          console.log("Wallet not connected, attempting to reconnect...");
          try {
            await solana.connect();
          } catch (connectErr) {
            console.error("Failed to reconnect:", connectErr);
            return { success: false, error: "钱包未连接，请刷新页面重新连接" };
          }
        }

        // 动态导入 @solana/web3.js
        const { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } = await import("@solana/web3.js");
        
        // 使用 Phantom 当前的 publicKey，而不是存储的地址
        // 因为用户可能在 Phantom 中切换了账户
        const currentPublicKey = solana.publicKey;
        if (!currentPublicKey) {
          return { success: false, error: "无法获取钱包地址，请重新连接钱包" };
        }
        const currentAddress = currentPublicKey.toBase58();
        
        // 如果当前账户与存储的不一致，提示用户
        if (currentAddress !== wallet.address) {
          console.warn("Wallet account changed! Stored:", wallet.address, "Current:", currentAddress);
          // 更新存储的地址 - 这里暂时用当前地址继续
        }
        
        // 创建转账交易 - 使用 Phantom 当前账户
        // 需要将 solana.publicKey 转换为 @solana/web3.js 的 PublicKey 类型
        const fromPubkey = new PublicKey(currentAddress);
        const toPubkey = new PublicKey(params.to);
        const lamports = Math.floor(params.amount * LAMPORTS_PER_SOL);
        
        // 调试日志
        console.log("=== Solana Transfer Debug ===");
        console.log("Stored address:", wallet.address);
        console.log("Current Phantom address:", currentAddress);
        console.log("From (using current):", currentAddress);
        console.log("To:", params.to);
        console.log("Amount (SOL):", params.amount);
        console.log("Lamports:", lamports);
        
        // 检查参数有效性
        if (!params.to || params.to.length < 32) {
          return { success: false, error: `无效的接收地址: ${params.to}` };
        }
        if (lamports <= 0) {
          return { success: false, error: `无效的转账金额: ${params.amount} SOL` };
        }
        
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          })
        );
        
        // 设置 feePayer - 使用当前账户
        transaction.feePayer = fromPubkey;
        
        // 获取 recentBlockhash - 尝试多个 RPC 节点
        // 备用 RPC 列表（按优先级）
        const rpcUrls = [
          process.env.NEXT_PUBLIC_SOLANA_RPC,
          "https://api.mainnet-beta.solana.com",
          "https://solana-mainnet.g.alchemy.com/v2/demo",
          "https://rpc.ankr.com/solana",
        ].filter(Boolean) as string[];
        
        let blockhash: string | null = null;
        let lastError: Error | null = null;
        
        for (const rpcUrl of rpcUrls) {
          try {
            console.log(`Trying RPC: ${rpcUrl.substring(0, 50)}...`);
            const connection = new Connection(rpcUrl, { commitment: "confirmed", confirmTransactionInitialTimeout: 10000 });
            const result = await connection.getLatestBlockhash();
            blockhash = result.blockhash;
            console.log("Got blockhash from:", rpcUrl.substring(0, 50));
            break;
          } catch (e) {
            console.warn(`RPC ${rpcUrl.substring(0, 50)} failed:`, e);
            lastError = e as Error;
          }
        }
        
        if (!blockhash) {
          return { success: false, error: `无法连接 Solana 网络，请检查网络连接后重试` };
        }
        
        transaction.recentBlockhash = blockhash;
        
        // 尝试多种方式发送交易
        try {
          console.log("Attempting to sign and send transaction...");
          
          // 方法1: 使用 signAndSendTransaction（Phantom 推荐方式）
          if (solana.signAndSendTransaction) {
            try {
              console.log("Using signAndSendTransaction...");
              const result = await solana.signAndSendTransaction(transaction, {
                skipPreflight: false,
                preflightCommitment: "confirmed",
              });
              console.log("Transaction sent via Phantom:", result.signature);
              return { success: true, txHash: result.signature, fromAddress: currentAddress };
            } catch (sendErr: unknown) {
              console.warn("signAndSendTransaction failed:", sendErr);
              const err = sendErr as { code?: number; message?: string };
              // 如果是用户取消，直接返回
              if (err?.code === 4001 || err?.message?.includes("User rejected")) {
                return { success: false, error: "用户取消了交易" };
              }
              // 其他错误尝试方法2
              console.log("Falling back to signTransaction + manual send...");
            }
          }
          
          // 方法2: signTransaction + 手动发送
          if (solana.signTransaction) {
            console.log("Using signTransaction + manual send...");
            const signed = await solana.signTransaction(transaction);
            console.log("Transaction signed, sending via RPC...");
          
            // 使用我们的 RPC 发送交易
            let txHash: string | null = null;
            let lastSendError: Error | null = null;
            for (const rpcUrl of rpcUrls) {
              try {
                const connection = new Connection(rpcUrl, { 
                  commitment: "confirmed",
                  confirmTransactionInitialTimeout: 30000 
                });
                txHash = await connection.sendRawTransaction((signed as { serialize: () => Buffer }).serialize(), {
                  skipPreflight: false,
                  preflightCommitment: "confirmed",
                });
                console.log("Transaction sent via:", rpcUrl.substring(0, 50), "txHash:", txHash);
                break;
              } catch (sendErr) {
                console.warn(`Send via ${rpcUrl.substring(0, 50)} failed:`, sendErr);
                lastSendError = sendErr as Error;
              }
            }
          
            if (!txHash) {
              return { success: false, error: lastSendError?.message || "发送交易失败，请稍后重试" };
            }
          
            return { success: true, txHash, fromAddress: currentAddress };
          }
          
          return { success: false, error: "钱包不支持签名交易" };
        } catch (signErr: unknown) {
          console.error("Sign/send error:", signErr);
          console.error("Sign error details:", JSON.stringify(signErr, Object.getOwnPropertyNames(signErr as object)));
          const err = signErr as { code?: number; message?: string };
          if (err?.code === 4001 || err?.message?.includes("User rejected")) {
            return { success: false, error: "用户取消了交易" };
          }
          if (err?.code === -32603) {
            // 尝试断开重连
            try {
              console.log("Attempting to disconnect and reconnect wallet...");
              await solana.disconnect();
              await new Promise(resolve => setTimeout(resolve, 500));
              await solana.connect();
              return { success: false, error: "钱包连接已重置，请重新尝试" };
            } catch {
              return { success: false, error: "钱包签名失败，请在 Phantom 中断开此网站后重新连接" };
            }
          }
          // 返回详细错误而不是重新抛出
          return { success: false, error: err?.message || "交易签名失败" };
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

        // 获取 MetaMask 当前账户（可能与存储的不同）
        const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
        const currentAddress = accounts[0];
        if (!currentAddress) {
          return { success: false, error: "无法获取 MetaMask 当前账户" };
        }
        
        if (currentAddress.toLowerCase() !== wallet.address.toLowerCase()) {
          console.warn("MetaMask account changed! Stored:", wallet.address, "Current:", currentAddress);
        }

        // 将 BNB 转换为 Wei（1 BNB = 10^18 Wei）
        const weiAmount = BigInt(Math.floor(params.amount * 1e18));
        const hexAmount = "0x" + weiAmount.toString(16);

        console.log("BSC transfer params:", {
          stored: wallet.address,
          current: currentAddress,
          from: currentAddress,
          to: params.to,
          value: hexAmount,
          amount: params.amount,
        });

        // 发送交易 - 使用当前账户
        try {
          const txHash = await ethereum.request({
            method: "eth_sendTransaction",
            params: [{
              from: currentAddress,
              to: params.to,
              value: hexAmount,
            }],
          }) as string;

          console.log("BSC transaction hash:", txHash);
          return { success: true, txHash, fromAddress: currentAddress };
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
        if (err?.code === 4100 || msg.includes("has not been authorized")) {
          errorMessage = "钱包未授权，请断开后重新连接钱包";
        } else if (msg.includes("insufficient lamports")) {
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
      } else if (err?.code === 4100) {
        errorMessage = "钱包未授权，请断开后重新连接钱包";
      } else if (err?.code === 4001) {
        errorMessage = "用户取消了交易";
      } else if (err?.code === -32000) {
        errorMessage = "钱包余额不足，请充值后重试";
      } else if (err?.code === -32603) {
        // Phantom 内部错误，通常是 RPC 或模拟问题
        errorMessage = "钱包内部错误。请尝试：1) 刷新页面 2) 断开重连钱包 3) 检查网络连接";
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
    isConnected?: boolean;
    publicKey?: { toString: () => string; toBytes: () => Uint8Array; toBase58: () => string };
    connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
    signTransaction?: (transaction: unknown) => Promise<unknown>;
    signAndSendTransaction?: (transaction: unknown, options?: { skipPreflight?: boolean; preflightCommitment?: string }) => Promise<{ signature: string }>;
  };
}

interface WindowWithEthereum extends Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
}
