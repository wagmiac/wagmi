/**
 * Pump.fun SDK 类型定义
 * 移植自 pumpdotfun-repumped-sdk
 */

import { Keypair, VersionedTransactionResponse } from '@solana/web3.js';

/**
 * 创建代币元数据
 */
export interface CreateTokenMetadata {
  name: string;
  symbol: string;
  description: string;
  file: Blob;
  twitter?: string;
  telegram?: string;
  website?: string;
}

/**
 * 优先费配置
 */
export interface PriorityFee {
  unitLimit: number;
  unitPrice: number;
}

/**
 * 交易结果
 */
export interface TransactionResult {
  signature?: string;
  error?: unknown;
  results?: VersionedTransactionResponse;
  success: boolean;
}

/**
 * IPFS 上传响应
 */
export interface IPFSResponse {
  metadataUri: string;
  metadata?: {
    name: string;
    symbol: string;
    description: string;
    image: string;
  };
}
