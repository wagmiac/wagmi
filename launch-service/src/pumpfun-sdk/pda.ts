/**
 * PDA 帮助函数
 * 移植自 pumpdotfun-repumped-sdk
 */

import { PublicKey } from '@solana/web3.js';
import {
  GLOBAL_ACCOUNT_SEED,
  EVENT_AUTHORITY_SEED,
  BONDING_CURVE_SEED,
  MINT_AUTHORITY_SEED,
  MPL_TOKEN_METADATA_PROGRAM_ID,
  METADATA_SEED,
  GLOBAL_VOLUME_SEED,
  USER_VOLUME_SEED,
  PUMP_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
} from './consts.js';

/**
 * 获取 Creator Vault PDA
 */
export function getCreatorVaultPda(creator: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('creator-vault'), creator.toBuffer()],
    PUMP_PROGRAM_ID
  )[0];
}

/**
 * 获取 Global Account PDA
 */
export function getGlobalAccountPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_ACCOUNT_SEED)],
    PUMP_PROGRAM_ID
  )[0];
}

/**
 * 获取 Event Authority PDA
 */
export function getEventAuthorityPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(EVENT_AUTHORITY_SEED)],
    PUMP_PROGRAM_ID
  )[0];
}

/**
 * 获取 Bonding Curve PDA
 */
export function getBondingCurvePDA(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
    PUMP_PROGRAM_ID
  )[0];
}

/**
 * 获取 Mint Authority PDA
 */
export function getMintAuthorityPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_AUTHORITY_SEED)],
    PUMP_PROGRAM_ID
  )[0];
}

/**
 * 获取 Pump Fee Config PDA
 */
export function getPumpFeeConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('fee_config'), PUMP_PROGRAM_ID.toBuffer()],
    PUMP_FEE_PROGRAM_ID
  )[0];
}

/**
 * 获取 Metadata PDA
 */
export function getMetadataPDA(mint: PublicKey): PublicKey {
  const metadataProgram = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);
  
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(METADATA_SEED), metadataProgram.toBuffer(), mint.toBuffer()],
    metadataProgram
  );
  return metadataPDA;
}

/**
 * 获取 Global Volume Accumulator PDA
 */
export function getGlobalVolumeAccumulatorPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_VOLUME_SEED)],
    PUMP_PROGRAM_ID
  )[0];
}

/**
 * 获取 User Volume Accumulator PDA
 */
export function getUserVolumeAccumulatorPda(user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(USER_VOLUME_SEED), user.toBuffer()],
    PUMP_PROGRAM_ID
  )[0];
}
