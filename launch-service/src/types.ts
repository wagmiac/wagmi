/**
 * 发射服务类型定义
 */

// 支持的发射台
export type Launchpad = 'pump.fun' | 'trends.fun' | 'bags.fm' | 'flap.sh' | 'four.meme';

// 支持的链
export type Chain = 'solana' | 'bsc';

// 发射台对应的链
export const LAUNCHPAD_CHAIN: Record<Launchpad, Chain> = {
  'pump.fun': 'solana',
  'trends.fun': 'solana',
  'bags.fm': 'solana',
  'flap.sh': 'bsc',
  'four.meme': 'bsc',
};

// 代币元数据
export interface TokenMetadata {
  name: string;           // 代币名称
  symbol: string;         // 代币符号
  description: string;    // 描述
  image?: string;         // Logo URL 或 Base64
  twitter?: string;       // Twitter 链接
  telegram?: string;      // Telegram 链接
  website?: string;       // 官网链接
}

// 创建代币请求
export interface CreateTokenRequest {
  launchpad: Launchpad;
  metadata: TokenMetadata;
  creatorPrivateKey: string;  // 创建者私钥（十六进制）
  initialBuyAmount?: number;  // 初始买入金额（SOL/BNB）
  taxRate?: number;           // flap.sh 专属：税率（基点，0=无税，100=1%，300=3%）
}

// 创建代币响应
export interface CreateTokenResponse {
  success: boolean;
  tokenAddress?: string;      // 代币合约地址
  createTxHash?: string;      // 创建交易哈希
  buyTxHash?: string;         // 初始买入交易哈希
  pumpFunUrl?: string;        // pump.fun 链接
  error?: string;
}

// 买入代币请求
export interface BuyTokenRequest {
  launchpad: Launchpad;
  tokenAddress: string;
  amount: number;             // 买入金额（SOL/BNB）
  buyerPrivateKey: string;    // 买家私钥（十六进制）
}

// 买入代币响应
export interface BuyTokenResponse {
  success: boolean;
  txHash?: string;
  tokenAmount?: string;       // 获得的代币数量
  error?: string;
}

// 卖出代币请求
export interface SellTokenRequest {
  launchpad: Launchpad;
  tokenAddress: string;
  tokenAmount: string;        // 卖出代币数量
  sellerPrivateKey: string;   // 卖家私钥（十六进制）
}

// 卖出代币响应
export interface SellTokenResponse {
  success: boolean;
  txHash?: string;
  receivedAmount?: string;    // 获得的 SOL/BNB 数量
  error?: string;
}

// ========== 验证与查询接口 ==========

// 验证交易请求
export interface VerifyTransactionRequest {
  chain: Chain;
  txHash: string;
  expectedTo: string;         // 预期接收地址
  expectedAmount: number;     // 预期金额（SOL/BNB）
}

// 验证交易响应
export interface VerifyTransactionResponse {
  success: boolean;
  verified: boolean;          // 是否验证通过
  confirmed: boolean;         // 是否已确认
  actualAmount?: number;      // 实际金额
  actualFrom?: string;        // 实际发送地址
  actualTo?: string;          // 实际接收地址
  error?: string;
}

// 查询代币余额请求
export interface TokenBalanceRequest {
  chain: Chain;
  tokenAddress: string;
  walletAddress: string;
}

// 查询代币余额响应
export interface TokenBalanceResponse {
  success: boolean;
  balance?: string;           // 代币余额（原始单位）
  decimals?: number;          // 代币精度
  error?: string;
}

// 转账代币请求
export interface TransferTokenRequest {
  chain: Chain;
  tokenAddress: string;
  fromPrivateKey: string;     // 发送方私钥（十六进制）
  toAddress: string;          // 接收地址
  amount: string;             // 转账数量（原始单位）
}

// 转账代币响应
export interface TransferTokenResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

// 转账原生代币请求（用于退款）
export interface TransferNativeRequest {
  chain: Chain;
  fromPrivateKey: string;     // 发送方私钥（十六进制）
  toAddress: string;          // 接收地址
  amount: number;             // 转账数量（SOL/BNB）
}

// 转账原生代币响应
export interface TransferNativeResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

// 健康检查响应
export interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  launchpads: {
    name: Launchpad;
    chain: Chain;
    available: boolean;
  }[];
}
