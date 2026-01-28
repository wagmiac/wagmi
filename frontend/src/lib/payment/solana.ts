/**
 * Solana SPL Token 转账（支持 USDC/USDT）
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { RPC_ENDPOINTS, STABLECOIN_CONFIG } from "./config";

// Phantom 钱包类型
interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  connect: () => Promise<{ publicKey: PublicKey }>;
}

// Solflare 钱包类型
interface SolflareProvider {
  isSolflare?: boolean;
  publicKey: PublicKey | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  connect: () => Promise<{ publicKey: PublicKey }>;
}

type SolanaWalletProvider = PhantomProvider | SolflareProvider;

/**
 * 获取 Solana 钱包 Provider
 */
function getSolanaProvider(): SolanaWalletProvider | null {
  if (typeof window === "undefined") return null;
  
  // 优先使用 Phantom
  const phantom = (window as unknown as { phantom?: { solana?: PhantomProvider } }).phantom?.solana;
  if (phantom?.isPhantom) {
    return phantom;
  }
  
  // 尝试 Solflare
  const solflare = (window as unknown as { solflare?: SolflareProvider }).solflare;
  if (solflare?.isSolflare) {
    return solflare;
  }
  
  return null;
}

/**
 * 转账 Solana 稳定币 (USDC)
 * @param fromAddress 付款地址
 * @param toAddress 收款地址（平台钱包）
 * @param amount 金额（不含精度，如 99 表示 99 USDC）
 * @returns 交易签名（哈希）
 */
export async function transferSolanaStablecoin(
  fromAddress: string,
  toAddress: string,
  amount: number
): Promise<string> {
  const provider = getSolanaProvider();
  if (!provider) {
    throw new Error("未检测到 Solana 钱包，请安装 Phantom 或 Solflare");
  }

  if (!provider.publicKey) {
    throw new Error("钱包未连接");
  }

  // 验证地址
  if (!fromAddress || fromAddress.trim() === "") {
    throw new Error("付款地址无效");
  }
  if (!toAddress || toAddress.trim() === "") {
    throw new Error("收款地址未配置，请联系管理员");
  }

  const config = STABLECOIN_CONFIG.solana;
  const connection = new Connection(RPC_ENDPOINTS.solana, "confirmed");
  
  let tokenMint: PublicKey;
  let fromPubkey: PublicKey;
  let toPubkey: PublicKey;
  
  try {
    tokenMint = new PublicKey(config.contract);
  } catch {
    throw new Error("USDC 合约地址配置无效");
  }
  
  try {
    fromPubkey = new PublicKey(fromAddress);
  } catch {
    throw new Error("付款钱包地址格式无效");
  }
  
  try {
    toPubkey = new PublicKey(toAddress);
  } catch {
    throw new Error("收款钱包地址格式无效");
  }

  // 计算带精度的金额（使用整数运算避免精度问题）
  const amountWithDecimals = BigInt(Math.round(amount * 10 ** config.decimals));

  // 获取发送者的代币账户
  const fromTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    fromPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // 获取接收者的代币账户
  const toTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    toPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // 检查发送者账户余额
  try {
    const fromAccount = await getAccount(connection, fromTokenAccount);
    if (fromAccount.amount < amountWithDecimals) {
      throw new Error(`${config.token} 余额不足，需要 ${amount} ${config.token}`);
    }
  } catch (err) {
    const errorName = (err as Error).name || "";
    const errorMessage = (err as Error).message || "";
    // TokenAccountNotFoundError 表示用户没有这个代币的账户
    if (errorName.includes("TokenAccountNotFoundError") || 
        errorMessage.includes("could not find account") ||
        errorMessage.includes("Account does not exist")) {
      throw new Error(`您的钱包中没有 ${config.token}，请先充值 USDC`);
    }
    throw err;
  }

  // 创建交易
  const transaction = new Transaction();

  // 检查接收者是否有代币账户，如果没有则创建
  try {
    await getAccount(connection, toTokenAccount);
  } catch {
    // 接收者没有代币账户，需要创建
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey, // 付款者（支付创建账户的 rent）
        toTokenAccount,
        toPubkey,
        tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // 添加转账指令
  transaction.add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      amountWithDecimals,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // 设置最近的区块哈希
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  // 签名交易
  const signedTransaction = await provider.signTransaction(transaction);

  // 发送交易
  const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  // 等待确认
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  return signature;
}

/**
 * 检查 Solana 稳定币余额 (USDC)
 */
export async function getSolanaStablecoinBalance(address: string): Promise<number> {
  const config = STABLECOIN_CONFIG.solana;
  const connection = new Connection(RPC_ENDPOINTS.solana, "confirmed");
  const tokenMint = new PublicKey(config.contract);
  const pubkey = new PublicKey(address);

  try {
    const tokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      pubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const account = await getAccount(connection, tokenAccount);
    return Number(account.amount) / 10 ** config.decimals;
  } catch {
    return 0;
  }
}

// 保留旧函数名作为别名
export const transferSolanaUSDT = transferSolanaStablecoin;
export const getSolanaUSDTBalance = getSolanaStablecoinBalance;
