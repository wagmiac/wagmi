/**
 * 支付配置
 * 收款钱包地址从环境变量读取，确保安全
 */

import { Chain } from "@/types/imo";

// ========== 发掘费用配置（稳定币）==========

// 发掘费用 $99
export const DISCOVERY_FEE = {
  amount: 99,
  usd: 99,
};

// 稳定币配置
export const STABLECOIN_CONFIG = {
  solana: {
    token: "USDC",
    // Solana 主网 USDC Mint 地址
    contract: process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
  },
  bsc: {
    token: "USDT",
    // BSC 主网 USDT 合约地址
    contract: process.env.NEXT_PUBLIC_BSC_USDT_CONTRACT || "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
  },
};

// ========== 平台收款地址 ==========

export const PLATFORM_WALLETS = {
  // Solana 收款地址（同时接收 SOL 和 USDC）
  solana: process.env.NEXT_PUBLIC_SOLANA_WALLET || "",
  // BSC 收款地址（同时接收 BNB 和 USDT）
  bsc: process.env.NEXT_PUBLIC_BSC_WALLET || "",
};

// ========== RPC 节点配置 ==========

export const RPC_ENDPOINTS = {
  solana: process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com",
  bsc: process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org/",
};

// ========== 旧配置（首单购买用，暂时保留）==========

// 平台费用配置（原生币）- 首单购买时使用
export const PLATFORM_FEE = {
  solana: {
    amount: 0.5, // 0.5 SOL
    currency: "SOL",
    decimals: 9,
  },
  bsc: {
    amount: 0.2, // 0.2 BNB
    currency: "BNB", 
    decimals: 18,
  },
};

// 首单购买最小金额
export const MIN_FIRST_BUY = {
  solana: {
    amount: 0.1, // 最少 0.1 SOL
    currency: "SOL",
  },
  bsc: {
    amount: 0.05, // 最少 0.05 BNB
    currency: "BNB",
  },
};

// USDT 合约地址（旧配置，保留兼容）
export const USDT_CONTRACTS = {
  solana: process.env.NEXT_PUBLIC_SOLANA_USDT_MINT || "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  bsc: process.env.NEXT_PUBLIC_BSC_USDT_CONTRACT || "0x55d398326f99059fF775485246999027B3197955",
};

// ========== 工具函数 ==========

/**
 * 获取指定链的收款地址
 */
export function getPlatformWallet(chain: Chain): string {
  const wallet = PLATFORM_WALLETS[chain];
  if (!wallet) {
    throw new Error(`未配置 ${chain.toUpperCase()} 链的收款地址`);
  }
  return wallet;
}

/**
 * 获取发掘费用配置（稳定币）
 */
export function getDiscoveryFee(chain: Chain) {
  const stablecoin = STABLECOIN_CONFIG[chain];
  return {
    amount: DISCOVERY_FEE.amount,
    token: stablecoin.token,
    contract: stablecoin.contract,
    decimals: stablecoin.decimals,
  };
}

/**
 * 获取平台费用（原生币，首单购买用）
 */
export function getPlatformFee(chain: Chain) {
  return PLATFORM_FEE[chain];
}

/**
 * 获取首单最小金额
 */
export function getMinFirstBuy(chain: Chain) {
  return MIN_FIRST_BUY[chain];
}

/**
 * 检查支付配置是否完整
 */
export function isPaymentConfigured(chain: Chain): boolean {
  return !!PLATFORM_WALLETS[chain];
}
