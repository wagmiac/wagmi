/**
 * 原生币转账（SOL / BNB）
 */

import { Chain } from "@/types/imo";
import { RPC_ENDPOINTS, PLATFORM_FEE } from "./config";

/**
 * 转账结果
 */
export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// ==================== Solana SOL 转账 ====================

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: { toBase58: () => string } | null;
  signAndSendTransaction: (transaction: unknown) => Promise<{ signature: string }>;
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
}

interface SolflareProvider {
  isSolflare?: boolean;
  publicKey: { toBase58: () => string } | null;
  signAndSendTransaction: (transaction: unknown) => Promise<{ signature: string }>;
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
}

type SolanaWalletProvider = PhantomProvider | SolflareProvider;

function getSolanaProvider(): SolanaWalletProvider | null {
  if (typeof window === "undefined") return null;
  
  const phantom = (window as unknown as { phantom?: { solana?: PhantomProvider } }).phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  
  const solflare = (window as unknown as { solflare?: SolflareProvider }).solflare;
  if (solflare?.isSolflare) return solflare;
  
  return null;
}

/**
 * 转账 SOL
 * @param toAddress 收款地址
 * @param amount SOL 金额
 */
export async function transferSOL(toAddress: string, amount: number): Promise<TransferResult> {
  try {
    const provider = getSolanaProvider();
    if (!provider) {
      return { success: false, error: "未检测到 Solana 钱包" };
    }

    if (!provider.publicKey) {
      return { success: false, error: "钱包未连接" };
    }

    // 动态导入 @solana/web3.js
    const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import("@solana/web3.js");

    const connection = new Connection(RPC_ENDPOINTS.solana, "confirmed");
    const fromPubkey = provider.publicKey;
    const toPubkey = new PublicKey(toAddress);
    
    // 转换为 lamports
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);

    // 检查余额
    const balance = await connection.getBalance(new PublicKey(fromPubkey.toBase58()));
    if (balance < lamports + 5000) { // 预留手续费
      return { success: false, error: `SOL 余额不足，需要 ${amount} SOL` };
    }

    // 创建转账交易
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromPubkey.toBase58()),
        toPubkey,
        lamports,
      })
    );

    // 设置最近的区块哈希
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(fromPubkey.toBase58());

    // 签名并发送
    const { signature } = await provider.signAndSendTransaction(transaction);

    // 确认交易
    await connection.confirmTransaction(signature, "confirmed");

    return { success: true, txHash: signature };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "转账失败" };
  }
}

// ==================== BSC BNB 转账 ====================

interface MetaMaskProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  selectedAddress: string | null;
}

const BSC_CHAIN_ID = "0x38"; // 56

function getMetaMaskProvider(): MetaMaskProvider | null {
  if (typeof window === "undefined") return null;
  const ethereum = (window as unknown as { ethereum?: MetaMaskProvider }).ethereum;
  return ethereum?.isMetaMask ? ethereum : null;
}

async function ensureBscNetwork(provider: MetaMaskProvider): Promise<void> {
  const chainId = await provider.request({ method: "eth_chainId" }) as string;
  
  if (chainId !== BSC_CHAIN_ID) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID }],
      });
    } catch (switchError: unknown) {
      if ((switchError as { code?: number }).code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: BSC_CHAIN_ID,
            chainName: "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: [RPC_ENDPOINTS.bsc],
            blockExplorerUrls: ["https://bscscan.com/"],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }
}

/**
 * 转账 BNB
 * @param toAddress 收款地址
 * @param amount BNB 金额
 */
export async function transferBNB(toAddress: string, amount: number): Promise<TransferResult> {
  try {
    const provider = getMetaMaskProvider();
    if (!provider) {
      return { success: false, error: "未检测到 MetaMask" };
    }

    await ensureBscNetwork(provider);

    const fromAddress = provider.selectedAddress;
    if (!fromAddress) {
      return { success: false, error: "钱包未连接" };
    }

    // 转换为 wei (18 位小数)
    const weiAmount = BigInt(Math.round(amount * 1e18));
    const hexValue = "0x" + weiAmount.toString(16);

    // 检查余额
    const balance = await provider.request({
      method: "eth_getBalance",
      params: [fromAddress, "latest"],
    }) as string;
    
    if (BigInt(balance) < weiAmount + BigInt(21000 * 5e9)) { // 预留 gas
      return { success: false, error: `BNB 余额不足，需要 ${amount} BNB` };
    }

    // 发送交易
    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [{
        from: fromAddress,
        to: toAddress,
        value: hexValue,
      }],
    }) as string;

    // 等待确认
    await waitForBscTransaction(provider, txHash);

    return { success: true, txHash };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "转账失败" };
  }
}

async function waitForBscTransaction(provider: MetaMaskProvider, txHash: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }) as { status: string } | null;
    
    if (receipt) {
      if (receipt.status === "0x1") return;
      throw new Error("交易失败");
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("交易确认超时");
}

// ==================== 统一接口 ====================

/**
 * 转账原生币（SOL 或 BNB）
 */
export async function transferNativeCoin(
  chain: Chain,
  toAddress: string,
  amount: number
): Promise<TransferResult> {
  if (chain === "solana") {
    return transferSOL(toAddress, amount);
  } else if (chain === "bsc") {
    return transferBNB(toAddress, amount);
  }
  return { success: false, error: `不支持的链: ${chain}` };
}

/**
 * 获取原生币余额
 */
export async function getNativeBalance(chain: Chain, address: string): Promise<number> {
  try {
    if (chain === "solana") {
      const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      const connection = new Connection(RPC_ENDPOINTS.solana, "confirmed");
      const balance = await connection.getBalance(new PublicKey(address));
      return balance / LAMPORTS_PER_SOL;
    } else if (chain === "bsc") {
      const provider = getMetaMaskProvider();
      if (!provider) return 0;
      const balance = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      }) as string;
      return Number(BigInt(balance)) / 1e18;
    }
  } catch {
    return 0;
  }
  return 0;
}
