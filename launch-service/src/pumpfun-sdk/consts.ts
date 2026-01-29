/**
 * Pump.fun SDK 常量定义
 * 移植自 pumpdotfun-repumped-sdk
 */

import { Commitment, Finality, PublicKey } from '@solana/web3.js';

// Metaplex Token Metadata Program ID
export const MPL_TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

// PDA Seeds
export const GLOBAL_ACCOUNT_SEED = 'global';
export const MINT_AUTHORITY_SEED = 'mint-authority';
export const BONDING_CURVE_SEED = 'bonding-curve';
export const METADATA_SEED = 'metadata';
export const EVENT_AUTHORITY_SEED = '__event_authority';
export const GLOBAL_VOLUME_SEED = 'global_volume_accumulator';
export const USER_VOLUME_SEED = 'user_volume_accumulator';

// Pump.fun Program IDs
export const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMP_FEE_PROGRAM_ID = new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ');

// 默认配置
export const DEFAULT_COMMITMENT: Commitment = 'confirmed';
export const DEFAULT_FINALITY: Finality = 'confirmed';
export const DEFAULT_DECIMALS = 6;

// API 端点
export const PUMP_FUN_IPFS_API = 'https://pump.fun/api/ipfs';
