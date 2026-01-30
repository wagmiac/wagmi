/**
 * Flap.sh 发射台集成 (BSC)
 * 
 * Flap.sh 是 BSC 上的 meme coin 发射台
 * 文档: https://docs.flap.sh/flap/developers/launch-a-token
 */

import { ethers, keccak256, toUtf8Bytes, getCreate2Address, concat, zeroPadValue, toBeHex } from 'ethers';
import { CONFIG } from '../config.js';
import type { 
  TokenMetadata, 
  CreateTokenResponse, 
  BuyTokenResponse, 
  SellTokenResponse 
} from '../types.js';

// Flap.sh 合约地址 (BSC Mainnet)
const FLAP_PORTAL_ADDRESS = '0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0';
const FLAP_API_URL = 'https://funcs.flap.sh/api/upload';

// Token 实现地址 (用于计算 vanity salt) - 从 Flap.sh 官方文档获取
// https://docs.flap.sh/developer-documentation/deployed-contract-addresses
const TOKEN_IMPL_NO_TAX = '0x8b4329947e34b6d56d71a3385cac122bade7d78d';
const TOKEN_IMPL_TAX_V1 = '0x29e6383F0ce68507b5A72a53c2B118a118332aA8'; // 正确的 Tax V1 地址
const TOKEN_IMPL_TAX_V2 = '0xae562c6A05b798499507c6276C6Ed796027807BA';

// 枚举定义
enum DexThreshType {
  TWO_THIRDS = 0,   // 66.67% supply
  FOUR_FIFTHS = 1,  // 80% supply (默认)
  HALF = 2,         // 50% supply
  _95_PERCENT = 3,  // 95% supply
  _81_PERCENT = 4,  // 81% supply
  _1_PERCENT = 5,   // 1% supply (测试用)
}

enum MigratorType {
  V3_MIGRATOR = 0,  // 迁移到 Uniswap V3 风格池
  V2_MIGRATOR = 1,  // 迁移到 Uniswap V2 风格池
}

enum DEXId {
  DEX0 = 0,  // BSC: PancakeSwap
  DEX1 = 1,
  DEX2 = 2,
}

enum V3LPFeeProfile {
  LP_FEE_PROFILE_STANDARD = 0,  // 0.25% PancakeSwap, 0.3% Uniswap
  LP_FEE_PROFILE_LOW = 1,       // 0.01% PancakeSwap, 0.05% Uniswap
  LP_FEE_PROFILE_HIGH = 2,      // 1% 高费率
}

// Portal 合约 ABI (简化版)
const FLAP_PORTAL_ABI = [
  // newTokenV2
  `function newTokenV2(tuple(
    string name,
    string symbol,
    string meta,
    uint8 dexThresh,
    bytes32 salt,
    uint16 taxRate,
    uint8 migratorType,
    address quoteToken,
    uint256 quoteAmt,
    address beneficiary,
    bytes permitData
  ) params) external payable returns (address token)`,
  
  // newTokenV4
  `function newTokenV4(tuple(
    string name,
    string symbol,
    string meta,
    uint8 dexThresh,
    bytes32 salt,
    uint16 taxRate,
    uint8 migratorType,
    address quoteToken,
    uint256 quoteAmt,
    address beneficiary,
    bytes permitData,
    bytes32 extensionID,
    bytes extensionData,
    uint8 dexId,
    uint8 lpFeeProfile
  ) params) external payable returns (address token)`,
  
  // 买入代币
  `function buy(address token, uint256 minTokenAmt, address recipient) external payable`,
  
  // 卖出代币
  `function sell(address token, uint256 tokenAmt, uint256 minQuoteAmt, address recipient) external`,
  
  // 事件
  `event TokenCreated(uint256 ts, address creator, uint256 nonce, address token, string name, string symbol, string meta)`,
];

// ERC20 ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

/**
 * IPFS 元数据响应
 */
interface IPFSUploadResponse {
  data?: {
    create: string;  // IPFS CID
  };
  errors?: Array<{ message: string }>;
}

/**
 * Flap.sh 发射服务
 */
export class FlapLauncher {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    // 配置支持代理的 FetchRequest
    const fetchReq = new ethers.FetchRequest(CONFIG.bscRpcUrl);
    
    // 如果配置了代理，使用代理
    if (CONFIG.httpProxy) {
      console.log(`Using HTTP proxy for BSC RPC: ${CONFIG.httpProxy}`);
      // ethers v6 不直接支持代理，但我们可以使用自定义 getUrlFunc
      // 这里我们先使用默认配置，在测试脚本中使用 undici 全局代理
    }
    
    this.provider = new ethers.JsonRpcProvider(fetchReq, undefined, {
      staticNetwork: true,  // 禁用网络检测，避免额外请求
    });
  }

  /**
   * 从十六进制私钥创建钱包
   */
  private walletFromHex(hexPrivateKey: string): ethers.Wallet {
    const key = hexPrivateKey.startsWith('0x') ? hexPrivateKey : `0x${hexPrivateKey}`;
    return new ethers.Wallet(key, this.provider);
  }

  /**
   * 上传元数据到 IPFS
   * 使用 Flap.sh 的 GraphQL API
   */
  async uploadMetadata(
    metadata: TokenMetadata,
    imageBuffer: Buffer,
    creatorAddress: string
  ): Promise<string> {
    const formData = new FormData();
    
    // GraphQL mutation
    const MUTATION_CREATE = `
      mutation Create($file: Upload!, $meta: MetadataInput!) {
        create(file: $file, meta: $meta)
      }
    `;
    
    formData.append(
      'operations',
      JSON.stringify({
        query: MUTATION_CREATE,
        variables: {
          file: null,
          meta: {
            website: metadata.website || null,
            twitter: metadata.twitter || null,
            telegram: metadata.telegram || null,
            description: metadata.description,
            creator: creatorAddress,
          },
        },
      })
    );
    
    formData.append(
      'map',
      JSON.stringify({
        '0': ['variables.file'],
      })
    );
    
    // 创建图片 Blob
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('0', imageBlob, 'image.png');
    
    console.log(`Uploading metadata to Flap.sh IPFS...`);
    
    const response = await fetch(FLAP_API_URL, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload metadata: ${response.statusText}`);
    }
    
    const result = await response.json() as IPFSUploadResponse;
    
    if (result.errors && result.errors.length > 0) {
      throw new Error(`IPFS upload failed: ${result.errors[0].message}`);
    }
    
    if (!result.data?.create) {
      throw new Error('No CID returned from IPFS upload');
    }
    
    const cid = result.data.create;
    console.log(`Metadata uploaded, CID: ${cid}`);
    
    return cid;
  }

  /**
   * 计算 vanity salt（代币地址以 8888 或 7777 结尾）
   * 
   * @param hasTax 是否是税币
   * @param maxIterations 最大迭代次数
   */
  async findVanitySalt(hasTax: boolean = false, maxIterations: number = 500000): Promise<{ salt: string; address: string }> {
    const suffix = hasTax ? '7777' : '8888';
    const tokenImpl = hasTax ? TOKEN_IMPL_TAX_V1 : TOKEN_IMPL_NO_TAX;
    
    // EIP-1167 最小代理 bytecode
    const bytecode = '0x3d602d80600a3d3981f3363d3d373d3d3d363d73'
      + tokenImpl.slice(2).toLowerCase()
      + '5af43d82803e903d91602b57fd5bf3';
    
    console.log(`Finding vanity salt for suffix: ${suffix}`);
    
    // 使用随机种子开始
    let seed = ethers.hexlify(ethers.randomBytes(32));
    let iterations = 0;
    
    while (iterations < maxIterations) {
      // 计算 CREATE2 地址
      const salt = keccak256(seed);
      const address = getCreate2Address(FLAP_PORTAL_ADDRESS, salt, keccak256(bytecode));
      
      if (address.toLowerCase().endsWith(suffix)) {
        console.log(`Found vanity salt after ${iterations} iterations`);
        console.log(`  Salt: ${salt}`);
        console.log(`  Address: ${address}`);
        return { salt, address };
      }
      
      // 继续哈希
      seed = keccak256(seed);
      iterations++;
      
      if (iterations % 10000 === 0) {
        console.log(`  Searched ${iterations} iterations...`);
      }
    }
    
    throw new Error(`Could not find vanity salt after ${maxIterations} iterations`);
  }

  /**
   * 创建代币并初始买入
   */
  async createAndBuy(
    metadata: TokenMetadata,
    creatorPrivateKeyHex: string,
    initialBuyAmountBNB: number = 0.001,
    imageBuffer?: Buffer
  ): Promise<CreateTokenResponse> {
    try {
      const wallet = this.walletFromHex(creatorPrivateKeyHex);
      const portal = new ethers.Contract(FLAP_PORTAL_ADDRESS, FLAP_PORTAL_ABI, wallet);
      
      console.log(`Creating token ${metadata.symbol} on Flap.sh...`);
      console.log(`  Creator: ${wallet.address}`);
      console.log(`  Initial buy: ${initialBuyAmountBNB} BNB`);
      
      // 1. 上传元数据到 IPFS
      let metaCid: string;
      let imgBuffer = imageBuffer;
      
      // 如果没有 imageBuffer，尝试从 metadata.image 获取
      if (!imgBuffer && metadata.image) {
        if (metadata.image.startsWith('data:')) {
          // Base64 图片
          const base64Data = metadata.image.split(',')[1];
          imgBuffer = Buffer.from(base64Data, 'base64');
        } else if (metadata.image.startsWith('http')) {
          // URL 图片，下载
          console.log(`Downloading image from: ${metadata.image}`);
          const response = await fetch(metadata.image);
          const arrayBuffer = await response.arrayBuffer();
          imgBuffer = Buffer.from(arrayBuffer);
        } else if (metadata.image.startsWith('bafkrei')) {
          // 已经是 IPFS CID，直接使用
          metaCid = metadata.image;
        }
      }
      
      // 如果有 imgBuffer，上传到 IPFS
      if (imgBuffer) {
        metaCid = await this.uploadMetadata(metadata, imgBuffer, wallet.address);
      } else if (!metaCid!) {
        throw new Error('Image buffer, URL, Base64, or IPFS CID required');
      }
      
      // 2. 查找 vanity salt
      const { salt, address: predictedAddress } = await this.findVanitySalt(false);
      
      // 3. 构建参数
      const quoteAmt = ethers.parseEther(initialBuyAmountBNB.toString());
      
      const params = {
        name: metadata.name,
        symbol: metadata.symbol,
        meta: metaCid!,
        dexThresh: DexThreshType.FOUR_FIFTHS,  // 80% 供应量后迁移到 DEX
        salt: salt,
        taxRate: 0,  // 无税
        migratorType: MigratorType.V3_MIGRATOR,
        quoteToken: ethers.ZeroAddress,  // BNB
        quoteAmt: quoteAmt,
        beneficiary: wallet.address,
        permitData: '0x',
        extensionID: ethers.ZeroHash,
        extensionData: '0x',
        dexId: DEXId.DEX0,  // PancakeSwap
        lpFeeProfile: V3LPFeeProfile.LP_FEE_PROFILE_STANDARD,
      };
      
      console.log(`Sending newTokenV4 transaction...`);
      console.log(`  Predicted token address: ${predictedAddress}`);
      
      // 4. 发送交易
      const tx = await portal.newTokenV4(params, {
        value: quoteAmt,
        gasLimit: 1000000,  // 设置合理的 gas limit
      });
      
      console.log(`Transaction sent: ${tx.hash}`);
      
      // 5. 等待确认
      const receipt = await tx.wait();
      
      // 6. 从事件中获取实际代币地址
      let tokenAddress = predictedAddress;
      for (const log of receipt.logs) {
        try {
          const parsed = portal.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === 'TokenCreated') {
            tokenAddress = parsed.args.token;
            console.log(`Token created at: ${tokenAddress}`);
            break;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
      
      return {
        success: true,
        tokenAddress: tokenAddress,
        createTxHash: tx.hash,
        pumpFunUrl: `https://flap.sh/token/${tokenAddress}`,
      };
    } catch (error) {
      console.error('Failed to create token on Flap.sh:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 创建税币并初始买入
   * 
   * @param metadata 代币元数据
   * @param creatorPrivateKeyHex 创建者私钥
   * @param taxRate 税率（基点，100 = 1%，最大 1000 = 10%）
   * @param initialBuyAmountBNB 初始买入金额（BNB）
   * @param imageBuffer 图片 Buffer
   */
  async createAndBuyWithTax(
    metadata: TokenMetadata,
    creatorPrivateKeyHex: string,
    taxRate: number = 300,  // 默认 3%
    initialBuyAmountBNB: number = 0.001,
    imageBuffer?: Buffer
  ): Promise<CreateTokenResponse> {
    try {
      // 验证税率
      if (taxRate < 0 || taxRate > 1000) {
        throw new Error('Tax rate must be between 0 and 1000 (0-10%)');
      }
      
      const wallet = this.walletFromHex(creatorPrivateKeyHex);
      const portal = new ethers.Contract(FLAP_PORTAL_ADDRESS, FLAP_PORTAL_ABI, wallet);
      
      console.log(`Creating tax token ${metadata.symbol} on Flap.sh...`);
      console.log(`  Creator: ${wallet.address}`);
      console.log(`  Tax Rate: ${taxRate / 100}%`);
      console.log(`  Initial buy: ${initialBuyAmountBNB} BNB`);
      
      // 1. 上传元数据到 IPFS
      let metaCid: string;
      let imgBuffer = imageBuffer;
      
      // 如果没有 imageBuffer，尝试从 metadata.image 获取
      if (!imgBuffer && metadata.image) {
        if (metadata.image.startsWith('data:')) {
          // Base64 图片
          const base64Data = metadata.image.split(',')[1];
          imgBuffer = Buffer.from(base64Data, 'base64');
        } else if (metadata.image.startsWith('http')) {
          // URL 图片，下载
          console.log(`Downloading image from: ${metadata.image}`);
          const response = await fetch(metadata.image);
          const arrayBuffer = await response.arrayBuffer();
          imgBuffer = Buffer.from(arrayBuffer);
        } else if (metadata.image.startsWith('bafkrei')) {
          // 已经是 IPFS CID，直接使用
          metaCid = metadata.image;
        }
      }
      
      // 如果有 imgBuffer，上传到 IPFS
      if (imgBuffer) {
        metaCid = await this.uploadMetadata(metadata, imgBuffer, wallet.address);
      } else if (!metaCid!) {
        throw new Error('Image buffer, URL, Base64, or IPFS CID required');
      }
      
      // 2. 查找 vanity salt（税币使用 7777 后缀）
      const { salt, address: predictedAddress } = await this.findVanitySalt(true);
      
      // 3. 构建参数
      const quoteAmt = ethers.parseEther(initialBuyAmountBNB.toString());
      
      // 税币必须使用 V2_MIGRATOR
      const params = {
        name: metadata.name,
        symbol: metadata.symbol,
        meta: metaCid!,
        dexThresh: DexThreshType.FOUR_FIFTHS,  // 80% 供应量后迁移到 DEX
        salt: salt,
        taxRate: taxRate,  // 税率（基点）
        migratorType: MigratorType.V2_MIGRATOR,  // 税币必须用 V2
        quoteToken: ethers.ZeroAddress,  // BNB
        quoteAmt: quoteAmt,
        beneficiary: wallet.address,  // 税费接收地址
        permitData: '0x',
        extensionID: ethers.ZeroHash,
        extensionData: '0x',
        dexId: DEXId.DEX0,  // PancakeSwap
        lpFeeProfile: V3LPFeeProfile.LP_FEE_PROFILE_STANDARD,
      };
      
      console.log(`Sending newTokenV4 transaction for tax token...`);
      console.log(`  Predicted token address: ${predictedAddress}`);
      
      // 4. 发送交易
      const tx = await portal.newTokenV4(params, {
        value: quoteAmt,
        gasLimit: 1500000,  // 税币可能需要更多 gas
      });
      
      console.log(`Transaction sent: ${tx.hash}`);
      
      // 5. 等待确认
      const receipt = await tx.wait();
      
      // 6. 从事件中获取实际代币地址
      let tokenAddress = predictedAddress;
      for (const log of receipt.logs) {
        try {
          const parsed = portal.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === 'TokenCreated') {
            tokenAddress = parsed.args.token;
            console.log(`Tax token created at: ${tokenAddress}`);
            break;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
      
      return {
        success: true,
        tokenAddress: tokenAddress,
        createTxHash: tx.hash,
        pumpFunUrl: `https://flap.sh/token/${tokenAddress}`,
      };
    } catch (error) {
      console.error('Failed to create tax token on Flap.sh:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 买入代币
   */
  async buy(
    tokenAddress: string,
    buyerPrivateKeyHex: string,
    amountBNB: number,
    minTokenAmount: bigint = 0n
  ): Promise<BuyTokenResponse> {
    try {
      const wallet = this.walletFromHex(buyerPrivateKeyHex);
      const portal = new ethers.Contract(FLAP_PORTAL_ADDRESS, FLAP_PORTAL_ABI, wallet);
      
      const value = ethers.parseEther(amountBNB.toString());
      
      console.log(`Buying ${amountBNB} BNB worth of ${tokenAddress} on Flap.sh...`);
      console.log(`  Buyer: ${wallet.address}`);
      
      const tx = await portal.buy(
        tokenAddress,
        minTokenAmount,  // 最小代币数量
        wallet.address,  // 接收者
        {
          value: value,
          gasLimit: 300000,
        }
      );
      
      console.log(`Buy transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash,
        tokenAmount: '0',  // TODO: 从事件解析
      };
    } catch (error) {
      console.error('Failed to buy token on Flap.sh:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 卖出代币
   */
  async sell(
    tokenAddress: string,
    sellerPrivateKeyHex: string,
    tokenAmount: string | bigint,
    minBNBOutput: bigint = 0n
  ): Promise<SellTokenResponse> {
    try {
      const wallet = this.walletFromHex(sellerPrivateKeyHex);
      const portal = new ethers.Contract(FLAP_PORTAL_ADDRESS, FLAP_PORTAL_ABI, wallet);
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      
      // 转换 tokenAmount 为 bigint
      const amount = typeof tokenAmount === 'string' ? BigInt(tokenAmount) : tokenAmount;
      
      console.log(`Selling ${amount} tokens of ${tokenAddress} on Flap.sh...`);
      console.log(`  Seller: ${wallet.address}`);
      
      // 检查并授权
      const allowance = await token.allowance(wallet.address, FLAP_PORTAL_ADDRESS);
      if (allowance < amount) {
        console.log(`Approving tokens for Portal...`);
        const approveTx = await token.approve(FLAP_PORTAL_ADDRESS, ethers.MaxUint256);
        await approveTx.wait();
        console.log(`Approval confirmed`);
      }
      
      // 卖出
      const tx = await portal.sell(
        tokenAddress,
        amount,
        minBNBOutput,
        wallet.address,
        {
          gasLimit: 300000,
        }
      );
      
      console.log(`Sell transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash,
        receivedAmount: '0',  // TODO: 从事件解析实际收到的 BNB
      };
    } catch (error) {
      console.error('Failed to sell token on Flap.sh:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 获取代币信息
   */
  async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    totalSupply: bigint;
    balance: bigint;
  } | null> {
    try {
      const token = new ethers.Contract(tokenAddress, [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function decimals() view returns (uint8)',
      ], this.provider);
      
      const [name, symbol, totalSupply] = await Promise.all([
        token.name(),
        token.symbol(),
        token.totalSupply(),
      ]);
      
      return {
        name,
        symbol,
        totalSupply,
        balance: 0n,
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      return null;
    }
  }

  /**
   * 检查服务是否可用
   */
  async healthCheck(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber > 0;
    } catch {
      return false;
    }
  }
}

// 导出单例
export const flapLauncher = new FlapLauncher();
