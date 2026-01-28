/**
 * 统一支付接口
 * 发掘支付：$99 稳定币（Solana用USDC，BSC用USDT）
 */

import { Chain } from "@/types/imo";
import { getNativeBalance, TransferResult } from "./native";
import { transferSolanaStablecoin, getSolanaStablecoinBalance } from "./solana";
import { transferBscStablecoin, getBscStablecoinBalance } from "./bsc";
import { 
  DISCOVERY_FEE,
  STABLECOIN_CONFIG,
  getPlatformWallet, 
  getDiscoveryFee,
  isPaymentConfigured,
} from "./config";

export { 
  DISCOVERY_FEE,
  STABLECOIN_CONFIG,
  getPlatformWallet, 
  getDiscoveryFee,
  isPaymentConfigured,
  getNativeBalance,
};

export type { TransferResult };

/**
 * 获取稳定币余额
 * @param chain 目标链
 * @param address 钱包地址
 * @returns 稳定币余额
 */
export async function getStablecoinBalance(chain: Chain, address: string): Promise<number> {
  if (chain === "solana") {
    return getSolanaStablecoinBalance(address);
  } else if (chain === "bsc") {
    return getBscStablecoinBalance(address);
  }
  throw new Error(`不支持的链: ${chain}`);
}

/**
 * 获取链对应的稳定币名称
 * @param chain 目标链
 * @returns 稳定币名称 (USDC 或 USDT)
 */
export function getStablecoinName(chain: Chain): string {
  return STABLECOIN_CONFIG[chain]?.token || "USDT";
}

/**
 * 执行发掘支付（$99 稳定币）
 * @param chain 当前连接的链（Solana 用 USDC，BSC 用 USDT）
 * @param fromAddress 付款钱包地址
 * @param amountOverride 金额覆盖值（免单时传 0）
 */
export async function payForDiscoveryWithStablecoin(
  chain: Chain,
  fromAddress: string,
  amountOverride?: number
): Promise<TransferResult> {
  // 检查配置
  if (!isPaymentConfigured(chain)) {
    return {
      success: false,
      error: `${chain.toUpperCase()} 链的收款地址未配置`,
    };
  }

  const platformWallet = getPlatformWallet(chain);
  
  // 检查收款地址是否有效
  if (!platformWallet || platformWallet.trim() === "") {
    return {
      success: false,
      error: `${chain.toUpperCase()} 链的收款地址未配置，请联系管理员`,
    };
  }
  
  // 检查付款地址是否有效
  if (!fromAddress || fromAddress.trim() === "") {
    return {
      success: false,
      error: "钱包地址无效，请重新连接钱包",
    };
  }
  
  const discoveryFee = getDiscoveryFee(chain);
  
  // 计算支付金额：如果指定了覆盖值（免单码时为0），使用覆盖值
  const amount = amountOverride !== undefined ? amountOverride : discoveryFee.amount;
  
  // 如果金额为0（免单），直接返回成功
  if (amount === 0) {
    return {
      success: true,
      txHash: "FREE_PROMO_CODE",
    };
  }

  try {
    // 根据链选择对应的稳定币转账
    let txHash: string;
    console.log(`[Payment] 开始支付 ${amount} ${chain === "solana" ? "USDC" : "USDT"}`);
    console.log(`[Payment] 付款地址: ${fromAddress}`);
    console.log(`[Payment] 收款地址: ${platformWallet}`);
    
    if (chain === "solana") {
      // Solana 链使用 USDC
      txHash = await transferSolanaStablecoin(fromAddress, platformWallet, amount);
    } else if (chain === "bsc") {
      // BSC 链使用 USDT
      txHash = await transferBscStablecoin(fromAddress, platformWallet, amount);
    } else {
      return {
        success: false,
        error: `不支持的链: ${chain}`,
      };
    }

    console.log(`[Payment] 支付成功, txHash: ${txHash}`);
    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error(`[Payment] 支付失败:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "支付失败",
    };
  }
}
