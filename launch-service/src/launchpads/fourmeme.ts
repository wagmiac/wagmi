/**
 * Four.meme 发射台集成 (BSC)
 * 
 * Four.meme 是 BSC 上的 meme coin 发射台
 * API 文档参考: docs/API-CreateToken.30-10-2025.md
 * 
 * 流程:
 * 1. 获取 nonce
 * 2. 签名登录获取 access_token
 * 3. 上传代币图片
 * 4. 调用 API 创建代币获取签名参数
 * 5. 调用链上合约 TokenManager2.createToken()
 */

import { ethers } from 'ethers';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { CONFIG } from '../config.js';
import type { 
  TokenMetadata, 
  CreateTokenResponse, 
  BuyTokenResponse, 
  SellTokenResponse 
} from '../types.js';

// Four.meme API 基础 URL
const FOUR_MEME_API_BASE = 'https://four.meme/meme-api';

// Four.meme 合约地址 (BSC Mainnet)
// TokenManager2 合约地址 - 需要从 four.meme 获取或验证
const TOKEN_MANAGER_ADDRESS = '0x5c952063c7fc8610FFDB798152D69F0B9550762b';

// TokenManager2 ABI (简化版，只包含需要的函数)
const TOKEN_MANAGER_ABI = [
  'function createToken(bytes calldata createArg, bytes calldata sign) external payable returns (address)',
  'event TokenCreated(address indexed token, address indexed creator, string name, string symbol)',
];

// 支持的代币标签
const SUPPORTED_LABELS = ['Meme', 'AI', 'Defi', 'Games', 'Infra', 'De-Sci', 'Social', 'Depin', 'Charity', 'Others'];

/**
 * Four.meme API 响应类型
 */
interface FourMemeResponse<T = any> {
  code: number | string;
  msg?: string;
  data: T;
}

/**
 * 创建代币 API 响应
 */
interface CreateTokenApiResponse {
  createArg: string;      // 合约调用参数 (hex)
  signature: string;      // 签名 (hex)
  tokenAddress?: string;  // 预计的代币地址
}

/**
 * Four.meme 发射服务
 */
export class FourMemeLauncher {
  private provider: ethers.JsonRpcProvider;
  private proxyAgent?: HttpsProxyAgent<string>;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.bscRpcUrl);
    
    if (CONFIG.httpProxy) {
      this.proxyAgent = new HttpsProxyAgent(CONFIG.httpProxy);
      console.log('[FourMeme] Using proxy:', CONFIG.httpProxy);
    }
  }

  /**
   * 发送 HTTP 请求
   */
  private async request<T>(
    endpoint: string, 
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      isFormData?: boolean;
    } = {}
  ): Promise<FourMemeResponse<T>> {
    const url = `${FOUR_MEME_API_BASE}${endpoint}`;
    const { method = 'POST', headers = {}, body, isFormData = false } = options;
    
    const fetchOptions: any = {
      method,
      headers: {
        ...headers,
      },
      agent: this.proxyAgent,
    };
    
    if (body) {
      if (isFormData) {
        // FormData 会自动设置 Content-Type
        fetchOptions.body = body;
        if (body.getHeaders) {
          fetchOptions.headers = { ...fetchOptions.headers, ...body.getHeaders() };
        }
      } else {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
      }
    }
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json() as Promise<FourMemeResponse<T>>;
  }

  /**
   * 从十六进制私钥创建钱包
   */
  private walletFromHex(hexPrivateKey: string): ethers.Wallet {
    const key = hexPrivateKey.startsWith('0x') ? hexPrivateKey : `0x${hexPrivateKey}`;
    return new ethers.Wallet(key, this.provider);
  }

  /**
   * Step 1: 获取登录 nonce
   */
  async getNonce(walletAddress: string): Promise<string> {
    console.log('[FourMeme] Getting nonce for:', walletAddress);
    
    const response = await this.request<string>('/v1/private/user/nonce/generate', {
      body: {
        accountAddress: walletAddress,
        verifyType: 'LOGIN',
        networkCode: 'BSC',
      },
    });
    
    if (response.code !== 0 && response.code !== '0') {
      throw new Error(`Failed to get nonce: ${response.msg || response.code}`);
    }
    
    console.log('[FourMeme] Got nonce:', response.data);
    return response.data;
  }

  /**
   * Step 2: 登录获取 access_token
   */
  async login(wallet: ethers.Wallet, nonce: string): Promise<string> {
    console.log('[FourMeme] Logging in...');
    
    // 签名消息: "You are sign in Meme {nonce}"
    const message = `You are sign in Meme ${nonce}`;
    const signature = await wallet.signMessage(message);
    
    const response = await this.request<string>('/v1/private/user/login/dex', {
      body: {
        region: 'WEB',
        langType: 'EN',
        loginIp: '',
        inviteCode: '',
        verifyInfo: {
          address: wallet.address,
          networkCode: 'BSC',
          signature: signature,
          verifyType: 'LOGIN',
        },
        walletName: 'MetaMask',
      },
    });
    
    if (response.code !== 0 && response.code !== '0') {
      throw new Error(`Failed to login: ${response.msg || response.code}`);
    }
    
    console.log('[FourMeme] Login successful, got access token');
    return response.data;
  }

  /**
   * Step 3: 上传代币图片
   */
  async uploadImage(accessToken: string, imageBuffer: Buffer, filename: string = 'image.png'): Promise<string> {
    console.log('[FourMeme] Uploading image...');
    
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename,
      contentType: 'image/png',
    });
    
    const response = await this.request<string>('/v1/private/token/upload', {
      headers: {
        'meme-web-access': accessToken,
      },
      body: formData,
      isFormData: true,
    });
    
    if (response.code !== 0 && response.code !== '0') {
      throw new Error(`Failed to upload image: ${response.msg || response.code}`);
    }
    
    console.log('[FourMeme] Image uploaded:', response.data);
    return response.data;
  }

  /**
   * Step 4: 创建代币（获取签名参数）
   */
  async createTokenApi(
    accessToken: string, 
    params: {
      name: string;
      symbol: string;
      description: string;
      imageUrl: string;
      label?: string;
      preSale?: string;
      website?: string;
      twitter?: string;
      telegram?: string;
    }
  ): Promise<CreateTokenApiResponse> {
    console.log('[FourMeme] Creating token via API...');
    
    // 验证标签
    const label = params.label || 'Meme';
    if (!SUPPORTED_LABELS.includes(label)) {
      throw new Error(`Invalid label: ${label}. Must be one of: ${SUPPORTED_LABELS.join(', ')}`);
    }
    
    const response = await this.request<CreateTokenApiResponse>('/v1/private/token/create', {
      headers: {
        'meme-web-access': accessToken,
      },
      body: {
        // 可自定义参数
        name: params.name,
        shortName: params.symbol,
        desc: params.description,
        imgUrl: params.imageUrl,
        label: label,
        launchTime: Date.now(),
        preSale: params.preSale || '0',
        // URL 参数必须是有效的 https:// 格式，否则不传
        ...(params.website ? { webUrl: params.website } : {}),
        ...(params.twitter ? { twitterUrl: params.twitter } : {}),
        ...(params.telegram ? { telegramUrl: params.telegram } : {}),
        onlyMPC: false,
        
        // 固定参数
        totalSupply: 1000000000,
        raisedAmount: 24,
        saleRate: 0.8,
        reserveRate: 0,
        lpTradingFee: 0.0025,
        funGroup: false,
        clickFun: false,
        symbol: 'BNB',
        
        // raisedToken 配置
        raisedToken: {
          symbol: 'BNB',
          nativeSymbol: 'BNB',
          symbolAddress: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
          deployCost: '0',
          buyFee: '0.01',
          sellFee: '0.01',
          minTradeFee: '0',
          b0Amount: '8',
          totalBAmount: '24',
          totalAmount: '1000000000',
          tradeLevel: ['0.1', '0.5', '1'],
          status: 'PUBLISH',
          reservedNumber: 10,
          saleRate: '0.8',
          networkCode: 'BSC',
          platform: 'MEME',
        },
      },
    });
    
    if (response.code !== 0 && response.code !== '0') {
      throw new Error(`Failed to create token: ${response.msg || response.code}`);
    }
    
    console.log('[FourMeme] Got create token signature');
    return response.data;
  }

  /**
   * Step 5: 调用合约创建代币
   */
  async createTokenOnChain(
    wallet: ethers.Wallet,
    createArg: string,
    signature: string,
    preSaleBNB: number = 0
  ): Promise<{ txHash: string; tokenAddress?: string }> {
    console.log('[FourMeme] Creating token on-chain...');
    
    const contract = new ethers.Contract(
      TOKEN_MANAGER_ADDRESS,
      TOKEN_MANAGER_ABI,
      wallet
    );
    
    // 转换参数为 bytes
    const createArgBytes = ethers.getBytes(createArg);
    const signatureBytes = ethers.getBytes(signature);
    
    // 计算需要发送的 BNB (创建费 0.01 BNB + 预售金额)
    const creationFee = ethers.parseEther('0.01');
    const preSaleAmount = ethers.parseEther(preSaleBNB.toString());
    const totalValue = creationFee + preSaleAmount;
    
    console.log(`[FourMeme] Sending ${ethers.formatEther(totalValue)} BNB (fee: 0.01, preSale: ${preSaleBNB})`);
    
    const tx = await contract.createToken(createArgBytes, signatureBytes, {
      value: totalValue,
      gasLimit: 500000,
    });
    
    console.log('[FourMeme] Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('[FourMeme] Transaction confirmed in block:', receipt.blockNumber);
    
    // 从事件中获取代币地址
    let tokenAddress: string | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === 'TokenCreated') {
          tokenAddress = parsed.args.token;
          console.log('[FourMeme] Token created at:', tokenAddress);
          break;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    return {
      txHash: tx.hash,
      tokenAddress,
    };
  }

  /**
   * 创建代币并初始买入（完整流程）
   */
  async createAndBuy(
    metadata: TokenMetadata,
    creatorPrivateKeyHex: string,
    initialBuyAmountBNB: number = 0
  ): Promise<CreateTokenResponse> {
    try {
      const wallet = this.walletFromHex(creatorPrivateKeyHex);
      
      console.log(`[FourMeme] Creating token ${metadata.symbol}...`);
      console.log(`  Creator: ${wallet.address}`);
      console.log(`  Initial buy: ${initialBuyAmountBNB} BNB`);
      
      // Step 1: 获取 nonce
      const nonce = await this.getNonce(wallet.address);
      
      // Step 2: 登录
      const accessToken = await this.login(wallet, nonce);
      
      // Step 3: 上传图片
      let imageUrl: string;
      if (metadata.image) {
        let imageBuffer: Buffer;
        
        if (metadata.image.startsWith('data:')) {
          // Base64 图片
          const base64Data = metadata.image.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else if (metadata.image.startsWith('http')) {
          // URL 图片，下载
          const response = await fetch(metadata.image, { agent: this.proxyAgent });
          imageBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          throw new Error('Invalid image format. Must be base64 data URL or HTTP URL');
        }
        
        imageUrl = await this.uploadImage(accessToken, imageBuffer);
      } else {
        throw new Error('Image is required for four.meme');
      }
      
      // Step 4: 调用 API 创建代币
      const createResult = await this.createTokenApi(accessToken, {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        imageUrl,
        label: 'Meme',  // 默认使用 Meme 标签
        preSale: initialBuyAmountBNB > 0 ? initialBuyAmountBNB.toString() : '0',
        website: metadata.website,
        twitter: metadata.twitter,
        telegram: metadata.telegram,
      });
      
      // Step 5: 调用合约
      const { txHash, tokenAddress } = await this.createTokenOnChain(
        wallet,
        createResult.createArg,
        createResult.signature,
        initialBuyAmountBNB
      );
      
      return {
        success: true,
        tokenAddress: tokenAddress || createResult.tokenAddress,
        createTxHash: txHash,
        pumpFunUrl: `https://four.meme/token/${tokenAddress || createResult.tokenAddress}`,
      };
    } catch (error) {
      console.error('[FourMeme] Failed to create token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 买入代币
   * 
   * TODO: 需要获取 four.meme 的交易合约地址和 ABI
   */
  async buy(
    tokenAddress: string,
    buyerPrivateKeyHex: string,
    amountBNB: number
  ): Promise<BuyTokenResponse> {
    try {
      const wallet = this.walletFromHex(buyerPrivateKeyHex);
      
      console.log(`[FourMeme] Buying ${amountBNB} BNB worth of ${tokenAddress}...`);
      
      // TODO: 实现买入逻辑
      // 需要获取 four.meme 的交易合约
      
      return {
        success: false,
        error: 'four.meme buy not yet implemented - need trading contract ABI',
      };
    } catch (error) {
      console.error('[FourMeme] Failed to buy token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 卖出代币
   * 
   * TODO: 需要获取 four.meme 的交易合约地址和 ABI
   */
  async sell(
    tokenAddress: string,
    sellerPrivateKeyHex: string,
    tokenAmount: string
  ): Promise<SellTokenResponse> {
    try {
      const wallet = this.walletFromHex(sellerPrivateKeyHex);
      
      console.log(`[FourMeme] Selling ${tokenAmount} tokens of ${tokenAddress}...`);
      
      // TODO: 实现卖出逻辑
      // 需要获取 four.meme 的交易合约
      
      return {
        success: false,
        error: 'four.meme sell not yet implemented - need trading contract ABI',
      };
    } catch (error) {
      console.error('[FourMeme] Failed to sell token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
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
