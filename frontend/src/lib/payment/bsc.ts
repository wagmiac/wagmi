/**
 * BSC USDT (BEP-20) 转账
 */

import { RPC_ENDPOINTS, STABLECOIN_CONFIG } from "./config";

// MetaMask Provider 类型
interface MetaMaskProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

// ERC-20 Transfer ABI
const ERC20_TRANSFER_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];

// BSC 主网 Chain ID
const BSC_CHAIN_ID = "0x38"; // 56 in hex

/**
 * 获取 MetaMask Provider
 */
function getMetaMaskProvider(): MetaMaskProvider | null {
  if (typeof window === "undefined") return null;
  
  const ethereum = (window as unknown as { ethereum?: MetaMaskProvider }).ethereum;
  if (ethereum?.isMetaMask) {
    return ethereum;
  }
  
  return null;
}

/**
 * 确保连接到 BSC 网络
 */
async function ensureBscNetwork(provider: MetaMaskProvider): Promise<void> {
  const chainId = await provider.request({ method: "eth_chainId" }) as string;
  
  if (chainId !== BSC_CHAIN_ID) {
    try {
      // 尝试切换到 BSC
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID }],
      });
    } catch (switchError: unknown) {
      // 如果网络不存在，添加 BSC 网络
      if ((switchError as { code?: number }).code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BSC_CHAIN_ID,
              chainName: "BNB Smart Chain",
              nativeCurrency: {
                name: "BNB",
                symbol: "BNB",
                decimals: 18,
              },
              rpcUrls: [RPC_ENDPOINTS.bsc],
              blockExplorerUrls: ["https://bscscan.com/"],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }
}

/**
 * 编码 ERC-20 transfer 函数调用
 */
function encodeTransferData(toAddress: string, amount: bigint): string {
  // transfer(address,uint256) 函数签名
  const methodId = "0xa9059cbb";
  
  // 编码地址 (32 bytes, 左填充 0)
  const encodedAddress = toAddress.slice(2).toLowerCase().padStart(64, "0");
  
  // 编码金额 (32 bytes, 左填充 0)
  const encodedAmount = amount.toString(16).padStart(64, "0");
  
  return methodId + encodedAddress + encodedAmount;
}

/**
 * 转账 BSC 稳定币 (USDT)
 * @param fromAddress 付款地址
 * @param toAddress 收款地址（平台钱包）
 * @param amount 金额（不含精度，如 99 表示 99 USDT）
 * @returns 交易哈希
 */
export async function transferBscStablecoin(
  fromAddress: string,
  toAddress: string,
  amount: number
): Promise<string> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error("未检测到 MetaMask，请安装 MetaMask 钱包");
  }

  // 验证地址
  if (!fromAddress || fromAddress.trim() === "") {
    throw new Error("付款地址无效");
  }
  if (!toAddress || toAddress.trim() === "") {
    throw new Error("收款地址未配置，请联系管理员");
  }

  // 确保在 BSC 网络
  await ensureBscNetwork(provider);

  const config = STABLECOIN_CONFIG.bsc;
  
  // 计算带精度的金额
  const amountWithDecimals = BigInt(amount) * BigInt(10 ** config.decimals);

  // 检查余额
  const balance = await getBscStablecoinBalance(fromAddress);
  if (balance < amount) {
    throw new Error(`${config.token} 余额不足，需要 ${amount} ${config.token}，当前余额 ${balance.toFixed(2)} ${config.token}`);
  }

  // 编码转账数据
  const data = encodeTransferData(toAddress, amountWithDecimals);

  // 发送交易
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: fromAddress,
        to: config.contract,
        data: data,
        // gas 会自动估算
      },
    ],
  }) as string;

  // 等待交易确认
  await waitForTransaction(provider, txHash);

  return txHash;
}

/**
 * 等待交易确认
 */
async function waitForTransaction(
  provider: MetaMaskProvider, 
  txHash: string, 
  maxAttempts = 30
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }) as { status: string } | null;
    
    if (receipt) {
      if (receipt.status === "0x1") {
        return; // 成功
      } else {
        throw new Error("交易失败");
      }
    }
    
    // 等待 2 秒后重试
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error("交易确认超时");
}

/**
 * 检查 BSC 稳定币余额 (USDT)
 */
export async function getBscStablecoinBalance(address: string): Promise<number> {
  const provider = getMetaMaskProvider();
  if (!provider) return 0;

  const config = STABLECOIN_CONFIG.bsc;
  
  // balanceOf(address) 函数签名
  const methodId = "0x70a08231";
  const encodedAddress = address.slice(2).toLowerCase().padStart(64, "0");
  const data = methodId + encodedAddress;

  try {
    const result = await provider.request({
      method: "eth_call",
      params: [
        {
          to: config.contract,
          data: data,
        },
        "latest",
      ],
    }) as string;
    
    const balance = BigInt(result);
    return Number(balance) / 10 ** config.decimals;
  } catch {
    return 0;
  }
}

// 保留旧函数名作为别名
export const transferBscUSDT = transferBscStablecoin;
export const getBscUSDTBalance = getBscStablecoinBalance;
