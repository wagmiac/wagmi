/**
 * 交易工具函数
 * 移植自 pumpdotfun-repumped-sdk
 */

import {
  Connection,
  Transaction,
  PublicKey,
  Keypair,
  Commitment,
  Finality,
  ComputeBudgetProgram,
  SendTransactionError,
  VersionedTransaction,
  TransactionMessage,
  VersionedTransactionResponse,
} from '@solana/web3.js';
import { DEFAULT_COMMITMENT, DEFAULT_FINALITY } from './consts.js';
import { PriorityFee, TransactionResult } from './types.js';

/**
 * 发送交易
 */
export async function sendTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<TransactionResult> {
  const versionedTx = await buildSignedTx(
    priorityFees,
    tx,
    connection,
    payer,
    commitment,
    signers
  );

  try {
    const sig = await connection.sendTransaction(versionedTx, {
      skipPreflight: false,
    });
    console.log('sig:', `https://solscan.io/tx/${sig}`);

    const txResult = await getTxDetails(connection, sig, commitment, finality);
    if (!txResult) {
      return {
        success: false,
        error: 'Transaction failed',
      };
    }
    return {
      success: true,
      signature: sig,
      results: txResult,
    };
  } catch (e) {
    if (e instanceof SendTransactionError) {
      console.error('SendTransactionError:', e.message);
      console.error('Logs:', e.logs);
    }
    return {
      success: false,
      error: e,
    };
  }
}

/**
 * 构建版本化交易
 */
export const buildVersionedTx = async (
  connection: Connection,
  payer: PublicKey,
  tx: Transaction,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<VersionedTransaction> => {
  const blockHash = (await connection.getLatestBlockhash(commitment)).blockhash;

  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockHash,
    instructions: tx.instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

/**
 * 获取交易详情
 */
export const getTxDetails = async (
  connection: Connection,
  sig: string,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransactionResponse | null> => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig,
    },
    commitment
  );

  return connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: finality,
  });
};

/**
 * 构建签名交易
 */
export async function buildSignedTx(
  priorityFees: PriorityFee | undefined,
  tx: Transaction,
  connection: Connection,
  payer: PublicKey,
  commitment: Commitment,
  signers: Keypair[]
): Promise<VersionedTransaction> {
  const newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }

  newTx.add(tx);

  const versionedTx = await buildVersionedTx(
    connection,
    payer,
    newTx,
    commitment
  );
  versionedTx.sign(signers);
  return versionedTx;
}
