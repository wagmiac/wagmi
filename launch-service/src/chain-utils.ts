/**
 * 链上工具函数
 * 验证交易、查询余额、转账等
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { ethers } from 'ethers';
import { CONFIG } from './config.js';
import type { Chain, VerifyTransactionResponse, TokenBalanceResponse, TransferTokenResponse, TransferNativeResponse } from './types.js';

// ERC20 ABI（仅需要的函数）
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

/**
 * 获取 Solana Connection
 */
function getSolanaConnection(): Connection {
  return new Connection(CONFIG.solanaRpcUrl, 'confirmed');
}

/**
 * 获取 BSC Provider
 */
function getBSCProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(CONFIG.bscRpcUrl);
}

/**
 * 从十六进制私钥创建 Solana Keypair
 */
function keypairFromHex(hexPrivateKey: string): Keypair {
  const privateKeyBytes = Buffer.from(hexPrivateKey, 'hex');
  return Keypair.fromSecretKey(privateKeyBytes);
}

/**
 * 验证 Solana 交易
 */
async function verifySolanaTransaction(
  txHash: string,
  expectedTo: string,
  expectedAmount: number
): Promise<VerifyTransactionResponse> {
  try {
    const connection = getSolanaConnection();
    const signature = txHash;
    
    // 获取交易详情
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) {
      return {
        success: true,
        verified: false,
        confirmed: false,
        error: '交易未找到或未确认',
      };
    }
    
    // 检查交易是否成功
    if (tx.meta?.err) {
      return {
        success: true,
        verified: false,
        confirmed: true,
        error: '交易执行失败',
      };
    }
    
    // 解析交易指令，查找 SOL 转账
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];
    const accountKeys = tx.transaction.message.staticAccountKeys || 
                       (tx.transaction.message as any).accountKeys || [];
    
    // 找到接收者的余额变化
    let actualTo = '';
    let actualFrom = '';
    let actualAmount = 0;
    
    for (let i = 0; i < accountKeys.length; i++) {
      const pubkey = accountKeys[i].toBase58();
      const balanceChange = (postBalances[i] - preBalances[i]) / LAMPORTS_PER_SOL;
      
      if (balanceChange > 0 && pubkey === expectedTo) {
        actualTo = pubkey;
        actualAmount = balanceChange;
      } else if (balanceChange < 0) {
        actualFrom = pubkey;
      }
    }
    
    // 验证
    const amountTolerance = 0.001; // 允许 0.001 SOL 的误差（gas 费）
    const verified = actualTo === expectedTo && 
                    actualAmount >= expectedAmount - amountTolerance;
    
    return {
      success: true,
      verified,
      confirmed: true,
      actualAmount,
      actualFrom,
      actualTo,
    };
  } catch (error) {
    console.error('Verify Solana transaction error:', error);
    return {
      success: false,
      verified: false,
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 验证 BSC 交易
 */
async function verifyBSCTransaction(
  txHash: string,
  expectedTo: string,
  expectedAmount: number
): Promise<VerifyTransactionResponse> {
  try {
    const provider = getBSCProvider();
    
    // 获取交易收据
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return {
        success: true,
        verified: false,
        confirmed: false,
        error: '交易未找到或未确认',
      };
    }
    
    // 检查交易是否成功
    if (receipt.status !== 1) {
      return {
        success: true,
        verified: false,
        confirmed: true,
        error: '交易执行失败',
      };
    }
    
    // 获取交易详情
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return {
        success: false,
        verified: false,
        confirmed: false,
        error: '无法获取交易详情',
      };
    }
    
    const actualTo = tx.to?.toLowerCase() || '';
    const actualFrom = tx.from.toLowerCase();
    const actualAmount = Number(ethers.formatEther(tx.value));
    
    // 验证
    const amountTolerance = 0.0001; // 允许 0.0001 BNB 的误差
    const verified = actualTo === expectedTo.toLowerCase() && 
                    actualAmount >= expectedAmount - amountTolerance;
    
    return {
      success: true,
      verified,
      confirmed: true,
      actualAmount,
      actualFrom,
      actualTo,
    };
  } catch (error) {
    console.error('Verify BSC transaction error:', error);
    return {
      success: false,
      verified: false,
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 验证交易
 */
export async function verifyTransaction(
  chain: Chain,
  txHash: string,
  expectedTo: string,
  expectedAmount: number
): Promise<VerifyTransactionResponse> {
  if (chain === 'solana') {
    return verifySolanaTransaction(txHash, expectedTo, expectedAmount);
  } else {
    return verifyBSCTransaction(txHash, expectedTo, expectedAmount);
  }
}

/**
 * 查询 Solana SPL 代币余额
 */
async function getSolanaTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<TokenBalanceResponse> {
  try {
    const connection = getSolanaConnection();
    const mint = new PublicKey(tokenAddress);
    const owner = new PublicKey(walletAddress);
    
    const ata = await getAssociatedTokenAddress(mint, owner);
    
    try {
      const account = await getAccount(connection, ata);
      return {
        success: true,
        balance: account.amount.toString(),
        decimals: 6, // pump.fun 默认 6 位
      };
    } catch {
      // ATA 不存在，余额为 0
      return {
        success: true,
        balance: '0',
        decimals: 6,
      };
    }
  } catch (error) {
    console.error('Get Solana token balance error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 查询 BSC ERC20 代币余额
 */
async function getBSCTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<TokenBalanceResponse> {
  try {
    const provider = getBSCProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(walletAddress),
      contract.decimals(),
    ]);
    
    return {
      success: true,
      balance: balance.toString(),
      decimals: Number(decimals),
    };
  } catch (error) {
    console.error('Get BSC token balance error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 查询代币余额
 */
export async function getTokenBalance(
  chain: Chain,
  tokenAddress: string,
  walletAddress: string
): Promise<TokenBalanceResponse> {
  if (chain === 'solana') {
    return getSolanaTokenBalance(tokenAddress, walletAddress);
  } else {
    return getBSCTokenBalance(tokenAddress, walletAddress);
  }
}

/**
 * 转账 Solana SPL 代币
 */
async function transferSolanaToken(
  tokenAddress: string,
  fromPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<TransferTokenResponse> {
  try {
    const connection = getSolanaConnection();
    const fromWallet = keypairFromHex(fromPrivateKey);
    const mint = new PublicKey(tokenAddress);
    const toPubkey = new PublicKey(toAddress);
    
    // 获取源 ATA
    const fromAta = await getAssociatedTokenAddress(mint, fromWallet.publicKey);
    
    // 获取目标 ATA
    const toAta = await getAssociatedTokenAddress(mint, toPubkey);
    
    // 检查目标 ATA 是否存在
    const transaction = new Transaction();
    
    try {
      await getAccount(connection, toAta);
    } catch {
      // 目标 ATA 不存在，需要创建
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromWallet.publicKey, // payer
          toAta,               // ata
          toPubkey,            // owner
          mint                 // mint
        )
      );
    }
    
    // 添加转账指令
    transaction.add(
      createTransferInstruction(
        fromAta,                    // source
        toAta,                      // destination
        fromWallet.publicKey,       // owner
        BigInt(amount)              // amount
      )
    );
    
    // 发送交易
    const txHash = await sendAndConfirmTransaction(connection, transaction, [fromWallet]);
    
    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Transfer Solana token error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 转账 BSC ERC20 代币
 */
async function transferBSCToken(
  tokenAddress: string,
  fromPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<TransferTokenResponse> {
  try {
    const provider = getBSCProvider();
    const wallet = new ethers.Wallet(fromPrivateKey, provider);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    const tx = await contract.transfer(toAddress, amount);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error) {
    console.error('Transfer BSC token error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 转账代币
 */
export async function transferToken(
  chain: Chain,
  tokenAddress: string,
  fromPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<TransferTokenResponse> {
  if (chain === 'solana') {
    return transferSolanaToken(tokenAddress, fromPrivateKey, toAddress, amount);
  } else {
    return transferBSCToken(tokenAddress, fromPrivateKey, toAddress, amount);
  }
}

/**
 * 转账 Solana 原生代币 (SOL)
 */
async function transferSolanaNative(
  fromPrivateKey: string,
  toAddress: string,
  amount: number
): Promise<TransferNativeResponse> {
  try {
    const connection = getSolanaConnection();
    const fromWallet = keypairFromHex(fromPrivateKey);
    const toPubkey = new PublicKey(toAddress);
    
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey,
        lamports,
      })
    );
    
    const txHash = await sendAndConfirmTransaction(connection, transaction, [fromWallet]);
    
    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Transfer SOL error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 转账 BSC 原生代币 (BNB)
 */
async function transferBSCNative(
  fromPrivateKey: string,
  toAddress: string,
  amount: number
): Promise<TransferNativeResponse> {
  try {
    const provider = getBSCProvider();
    const wallet = new ethers.Wallet(fromPrivateKey, provider);
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount.toString()),
    });
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt?.hash,
    };
  } catch (error) {
    console.error('Transfer BNB error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 转账原生代币（用于退款）
 */
export async function transferNative(
  chain: Chain,
  fromPrivateKey: string,
  toAddress: string,
  amount: number
): Promise<TransferNativeResponse> {
  if (chain === 'solana') {
    return transferSolanaNative(fromPrivateKey, toAddress, amount);
  } else {
    return transferBSCNative(fromPrivateKey, toAddress, amount);
  }
}

/**
 * 查询 Solana 原生余额
 */
async function getSolanaNativeBalance(address: string): Promise<number> {
  const connection = getSolanaConnection();
  const pubkey = new PublicKey(address);
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * 查询 BSC 原生余额
 */
async function getBSCNativeBalance(address: string): Promise<number> {
  const provider = getBSCProvider();
  const balance = await provider.getBalance(address);
  return Number(ethers.formatEther(balance));
}

/**
 * 查询原生代币余额
 */
export async function getNativeBalance(chain: Chain, address: string): Promise<number> {
  if (chain === 'solana') {
    return getSolanaNativeBalance(address);
  } else {
    return getBSCNativeBalance(address);
  }
}
