"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Chain } from "@/types/imo";

/**
 * 钱包类型
 */
export type WalletType = "phantom" | "solflare" | "metamask";

/**
 * 钱包状态
 */
export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chain: Chain | null;
  walletType: WalletType | null;
}

/**
 * 钱包上下文类型
 */
interface WalletContextType extends WalletState {
  connect: (walletType: WalletType) => Promise<void>;
  disconnect: () => void;
  switchChain: (chain: Chain) => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType | null>(null);

/**
 * 钱包 Provider
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    chain: null,
    walletType: null,
  });

  /**
   * 连接钱包
   * TODO: 接入真正的钱包 SDK
   */
  const connect = useCallback(async (walletType: WalletType) => {
    setState((prev) => ({ ...prev, isConnecting: true }));

    try {
      // 模拟连接延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 检查是否有钱包扩展
      if (walletType === "phantom" || walletType === "solflare") {
        // Solana 钱包
        const solana = (window as WindowWithSolana).solana;
        if (solana?.isPhantom || solana?.isSolflare) {
          const response = await solana.connect();
          const address = response.publicKey.toString();
          setState({
            isConnected: true,
            isConnecting: false,
            address,
            chain: "solana",
            walletType,
          });
          return;
        }
      } else if (walletType === "metamask") {
        // EVM 钱包
        const ethereum = (window as WindowWithEthereum).ethereum;
        if (ethereum?.isMetaMask) {
          const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[];
          if (accounts && accounts.length > 0) {
            setState({
              isConnected: true,
              isConnecting: false,
              address: accounts[0],
              chain: "bsc",
              walletType,
            });
            return;
          }
        }
      }

      // 如果没有检测到钱包，使用 Mock 地址（开发用）
      const mockAddress =
        walletType === "metamask"
          ? "0x1234...abcd"
          : "7xKX...tg2a";
      const mockChain: Chain = walletType === "metamask" ? "bsc" : "solana";

      setState({
        isConnected: true,
        isConnecting: false,
        address: mockAddress,
        chain: mockChain,
        walletType,
      });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setState((prev) => ({ ...prev, isConnecting: false }));
    }
  }, []);

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      isConnecting: false,
      address: null,
      chain: null,
      walletType: null,
    });
  }, []);

  /**
   * 切换链
   */
  const switchChain = useCallback(async (chain: Chain) => {
    // TODO: 实现链切换
    setState((prev) => ({ ...prev, chain }));
  }, []);

  /**
   * 签名消息
   */
  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!state.isConnected || !state.walletType) {
      return null;
    }

    try {
      if (state.walletType === "phantom" || state.walletType === "solflare") {
        const solana = (window as WindowWithSolana).solana;
        if (solana) {
          const encodedMessage = new TextEncoder().encode(message);
          const signedMessage = await solana.signMessage(encodedMessage, "utf8");
          return Buffer.from(signedMessage.signature).toString("base64");
        }
      } else if (state.walletType === "metamask") {
        const ethereum = (window as WindowWithEthereum).ethereum;
        if (ethereum && state.address) {
          const signature = await ethereum.request({
            method: "personal_sign",
            params: [message, state.address],
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
  }, [state.isConnected, state.walletType, state.address]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        switchChain,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

/**
 * 使用钱包 Hook
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
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
