/**
 * Bags.fm 发射台集成 (Solana)
 * 
 * Bags.fm 是一个 Solana 上的代币发射平台，使用 Meteora 的 Dynamic Bonding Curve。
 * 
 * 使用官方 SDK: @bagsfm/bags-sdk
 * 
 * 主要特性：
 * 1. 支持费用分成（Fee Sharing）- 最多支持 100 个收益分配地址
 * 2. 使用 Meteora DBC（Dynamic Bonding Curve）机制
 * 3. 支持 Jito bundle 加速交易
 * 
 * 注意：bags-sdk 内置了自己版本的 @solana/web3.js，为避免类型冲突，
 * 我们使用 any 类型来处理跨版本交互
 */

import { 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL, 
  PublicKey,
} from '@solana/web3.js';
import { BagsSDK, WRAPPED_SOL_MINT } from '@bagsfm/bags-sdk';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodeFetch, { RequestInit as NodeFetchRequestInit } from 'node-fetch';
import bs58 from 'bs58';
import fs from 'fs';

import { CONFIG } from '../config.js';
import type { 
  TokenMetadata, 
  CreateTokenResponse, 
  BuyTokenResponse, 
  SellTokenResponse 
} from '../types.js';

// Bags.fm API Key（生产环境应该放在环境变量中）
const BAGS_API_KEY = process.env.BAGS_API_KEY || 'bags_prod_OcnhgDzivuUVCDeEgq2byNI8Mik0TSRCheY0S6WX3Cw';

// 费用分成配置
export interface FeeShareClaimer {
  wallet: string;  // Solana 钱包地址
  bps: number;     // 分成比例（基点，10000 = 100%）
}

/**
 * Bags.fm 发射服务
 */
export class BagsLauncher {
  private connection: Connection;

  constructor() {
    // 如果配置了代理，使用代理连接
    if (CONFIG.httpProxy) {
      const agent = new HttpsProxyAgent(CONFIG.httpProxy);
      this.connection = new Connection(CONFIG.solanaRpcUrl, {
        commitment: 'confirmed',
        fetch: async (url, options) => {
          const fetchOptions: NodeFetchRequestInit = {
            method: options?.method,
            headers: options?.headers as Record<string, string>,
            body: options?.body as string | Buffer | undefined,
            agent,
          };
          return nodeFetch(url as string, fetchOptions) as unknown as Response;
        },
      });
      console.log('[Bags] Using proxy:', CONFIG.httpProxy);
    } else {
      this.connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');
    }
  }

  /**
   * 初始化 SDK
   */
  private initSDK(): BagsSDK {
    // 使用 any 类型绕过 @solana/web3.js 版本不兼容问题
    return new BagsSDK(BAGS_API_KEY, this.connection as any, 'confirmed');
  }

  /**
   * 从十六进制私钥创建 Keypair
   */
  private keypairFromHex(hexPrivateKey: string): Keypair {
    const privateKeyBytes = Buffer.from(hexPrivateKey, 'hex');
    return Keypair.fromSecretKey(privateKeyBytes);
  }

  /**
   * 从 Base58 私钥创建 Keypair
   */
  private keypairFromBase58(base58PrivateKey: string): Keypair {
    const privateKeyBytes = bs58.decode(base58PrivateKey);
    return Keypair.fromSecretKey(privateKeyBytes);
  }

  /**
   * 判断私钥格式并创建 Keypair
   */
  private createKeypair(privateKey: string): Keypair {
    // 检测是否为十六进制格式（64 或 128 字符）
    if (/^[0-9a-fA-F]{64}$/.test(privateKey) || /^[0-9a-fA-F]{128}$/.test(privateKey)) {
      return this.keypairFromHex(privateKey);
    }
    // 否则尝试 Base58 格式
    return this.keypairFromBase58(privateKey);
  }

  /**
   * 准备图片数据
   */
  private async prepareImage(image?: string): Promise<Buffer | undefined> {
    if (!image) return undefined;

    if (image.startsWith('data:')) {
      // Base64 图片
      const base64Data = image.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    } else if (image.startsWith('http')) {
      // URL 图片，下载
      const response = await fetch(image);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else if (fs.existsSync(image)) {
      // 本地文件路径
      return fs.readFileSync(image);
    }

    return undefined;
  }

  /**
   * 签名并广播交易
   * 使用 any 类型处理 SDK 内部的 VersionedTransaction 类型
   */
  private async signAndSendTransaction(
    transaction: any, // SDK 返回的 VersionedTransaction
    signers: Keypair[]
  ): Promise<string> {
    // 获取最新的 blockhash（在签名前）
    const latestBlockhash = await this.connection.getLatestBlockhash('confirmed');
    
    // 签名交易
    transaction.sign(signers);

    // 发送交易，使用 skipPreflight 加速
    const signature = await this.connection.sendTransaction(transaction, {
      skipPreflight: true,  // 跳过预检以加速
      preflightCommitment: 'confirmed',
      maxRetries: 5,
    });

    console.log(`[Bags] TX sent: ${signature}, waiting for confirmation...`);

    // 等待确认，使用轮询而不是 websocket
    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
      await this.sleep(2000); // 每 2 秒检查一次
      
      try {
        const status = await this.connection.getSignatureStatus(signature);
        
        if (status?.value?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
        }
        
        if (status?.value?.confirmationStatus === 'confirmed' || 
            status?.value?.confirmationStatus === 'finalized') {
          console.log(`[Bags] Transaction confirmed (${status.value.confirmationStatus})`);
          return signature;
        }
        
        console.log(`[Bags] Waiting... (${i + 1}/${maxRetries})`);
      } catch (err: any) {
        // 忽略查询错误，继续重试
        if (i === maxRetries - 1) {
          throw err;
        }
      }
    }

    throw new Error(`Transaction confirmation timeout: ${signature}`);
  }

  /**
   * 休眠辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量签名并发送交易
   */
  private async signAndSendTransactions(
    transactions: any[], // SDK 返回的 VersionedTransaction[]
    signers: Keypair[]
  ): Promise<string[]> {
    const signatures: string[] = [];
    
    for (const tx of transactions) {
      const sig = await this.signAndSendTransaction(tx, signers);
      signatures.push(sig);
    }
    
    return signatures;
  }

  /**
   * 创建代币并初始买入
   * 
   * @param metadata - 代币元数据
   * @param creatorPrivateKey - 创建者私钥（十六进制或 Base58）
   * @param initialBuyAmountSOL - 初始买入金额（SOL）
   * @param feeShareClaimers - 费用分成配置（可选）
   */
  async createAndBuy(
    metadata: TokenMetadata,
    creatorPrivateKey: string,
    initialBuyAmountSOL: number = 0.0001,
    feeShareClaimers?: FeeShareClaimer[]
  ): Promise<CreateTokenResponse> {
    try {
      const creatorWallet = this.createKeypair(creatorPrivateKey);
      const sdk = this.initSDK();
      
      console.log(`[Bags] Creating token ${metadata.symbol}...`);
      console.log(`[Bags] Creator: ${creatorWallet.publicKey.toBase58()}`);

      // Step 1: 创建代币信息和元数据
      console.log('[Bags] Step 1: Creating token info and metadata...');
      
      const tokenInfoParams: any = {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        telegram: metadata.telegram,
        twitter: metadata.twitter,
        website: metadata.website,
      };

      // 处理图片 - SDK 要求必须提供 image 或 imageUrl 其中之一
      if (metadata.image) {
        if (metadata.image.startsWith('data:')) {
          // Base64 图片 -> 转为 Buffer
          const base64Data = metadata.image.split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');
          tokenInfoParams.image = {
            value: imageBuffer,
            options: {
              filename: 'token-logo.png',
              contentType: 'image/png',
            },
          };
          console.log(`[Bags] Using Base64 image, size: ${imageBuffer.length} bytes`);
        } else if (metadata.image.startsWith('http')) {
          // URL 图片
          tokenInfoParams.imageUrl = metadata.image;
          console.log(`[Bags] Using image URL: ${metadata.image}`);
        } else if (fs.existsSync(metadata.image)) {
          // 本地文件路径
          const imageBuffer = fs.readFileSync(metadata.image);
          tokenInfoParams.image = {
            value: imageBuffer,
            options: {
              filename: 'token-logo.png',
              contentType: 'image/png',
            },
          };
          console.log(`[Bags] Using local file: ${metadata.image}, size: ${imageBuffer.length} bytes`);
        } else {
          throw new Error('Invalid image format. Provide base64, URL, or file path.');
        }
      } else {
        throw new Error('Image is required for token creation.');
      }

      const tokenInfoResponse = await sdk.tokenLaunch.createTokenInfoAndMetadata(tokenInfoParams);
      
      console.log(`[Bags] Token mint: ${tokenInfoResponse.tokenMint}`);
      console.log(`[Bags] Metadata URL: ${tokenInfoResponse.tokenMetadata}`);
      
      const tokenMint = new PublicKey(tokenInfoResponse.tokenMint);

      // Step 2: 创建费用分成配置
      console.log('[Bags] Step 2: Creating fee share config...');
      
      // 默认创建者获得 100% 收益
      const feeClaimers = feeShareClaimers?.map(c => ({
        user: new PublicKey(c.wallet),
        userBps: c.bps,
      })) || [{
        user: creatorWallet.publicKey,
        userBps: 10000, // 100%
      }];

      // 验证总和等于 10000 (100%)
      const totalBps = feeClaimers.reduce((sum, c) => sum + c.userBps, 0);
      if (totalBps !== 10000) {
        throw new Error(`Fee share bps must sum to 10000, got ${totalBps}`);
      }

      const configResult = await sdk.config.createBagsFeeShareConfig({
        feeClaimers,
        payer: creatorWallet.publicKey,
        baseMint: tokenMint,
      });

      console.log(`[Bags] Config key: ${configResult.meteoraConfigKey.toBase58()}`);

      // 签名并发送配置交易
      const configSignatures: string[] = [];
      
      // 处理所有配置交易（可能有多个：创建 LUT + 扩展 LUT）
      // 注意：第一笔创建 LUT，后续扩展需要等待 LUT 激活
      if (configResult.transactions.length > 0) {
        console.log(`[Bags] Sending ${configResult.transactions.length} config transactions...`);
        for (let i = 0; i < configResult.transactions.length; i++) {
          const tx = configResult.transactions[i];
          
          // 第二笔及之后的交易需要等待 LUT 激活
          if (i > 0) {
            console.log(`[Bags] Waiting for LUT activation (5s)...`);
            await this.sleep(5000);
          }
          
          const sig = await this.signAndSendTransaction(tx, [creatorWallet]);
          configSignatures.push(sig);
          console.log(`[Bags] Config TX ${i + 1}: ${sig}`);
        }
      }

      // Step 3: 创建发射交易
      console.log('[Bags] Step 3: Creating launch transaction...');
      
      const initialBuyLamports = Math.floor(initialBuyAmountSOL * LAMPORTS_PER_SOL);
      
      const launchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
        metadataUrl: tokenInfoResponse.tokenMetadata,
        tokenMint,
        launchWallet: creatorWallet.publicKey,
        initialBuyLamports,
        configKey: configResult.meteoraConfigKey,
      });

      // Step 4 & 5: 签名并广播
      console.log('[Bags] Step 4 & 5: Signing and broadcasting launch transaction...');
      
      const launchSignature = await this.signAndSendTransaction(launchTransaction, [creatorWallet]);
      
      console.log(`[Bags] Token created successfully!`);
      console.log(`[Bags] Token address: ${tokenMint.toBase58()}`);
      console.log(`[Bags] Launch TX: ${launchSignature}`);

      return {
        success: true,
        tokenAddress: tokenMint.toBase58(),
        createTxHash: launchSignature,
        pumpFunUrl: `https://bags.fm/token/${tokenMint.toBase58()}`,
      };

    } catch (error) {
      console.error('[Bags] Failed to create token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 买入代币
   * 
   * 注意：Bags.fm 使用 Meteora 的 Dynamic Bonding Curve，
   * 买入功能通过 trade service 的 quote + swap 模式实现
   */
  async buy(
    tokenAddress: string,
    buyerPrivateKey: string,
    amountSOL: number
  ): Promise<BuyTokenResponse> {
    try {
      const buyerWallet = this.createKeypair(buyerPrivateKey);
      const sdk = this.initSDK();
      const tokenMint = new PublicKey(tokenAddress);
      
      console.log(`[Bags] Buying ${amountSOL} SOL worth of ${tokenAddress}...`);
      
      const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
      
      // Step 1: 获取报价（SOL -> Token）
      const quote = await sdk.trade.getQuote({
        inputMint: WRAPPED_SOL_MINT,
        outputMint: tokenMint,
        amount: amountLamports,
        slippageMode: 'manual',
        slippageBps: Number(CONFIG.slippageBps),
      });

      console.log(`[Bags] Quote: ${quote.inAmount} SOL -> ${quote.outAmount} tokens`);

      // Step 2: 创建交换交易
      const swapResult = await sdk.trade.createSwapTransaction({
        quoteResponse: quote,
        userPublicKey: buyerWallet.publicKey,
      });

      // Step 3: 签名并发送
      const signature = await this.signAndSendTransaction(swapResult.transaction, [buyerWallet]);
      
      console.log(`[Bags] Buy successful! TX: ${signature}`);

      return {
        success: true,
        txHash: signature,
        tokenAmount: quote.outAmount,
      };

    } catch (error) {
      console.error('[Bags] Failed to buy token:', error);
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
    sellerPrivateKey: string,
    tokenAmount: string
  ): Promise<SellTokenResponse> {
    try {
      const sellerWallet = this.createKeypair(sellerPrivateKey);
      const sdk = this.initSDK();
      const tokenMint = new PublicKey(tokenAddress);
      
      console.log(`[Bags] Selling ${tokenAmount} tokens of ${tokenAddress}...`);
      
      // 转换代币数量（假设 6 位小数）
      const amountTokens = Math.floor(parseFloat(tokenAmount) * 1_000_000);
      
      // Step 1: 获取报价（Token -> SOL）
      const quote = await sdk.trade.getQuote({
        inputMint: tokenMint,
        outputMint: WRAPPED_SOL_MINT,
        amount: amountTokens,
        slippageMode: 'manual',
        slippageBps: Number(CONFIG.slippageBps),
      });

      console.log(`[Bags] Quote: ${quote.inAmount} tokens -> ${quote.outAmount} SOL`);

      // Step 2: 创建交换交易
      const swapResult = await sdk.trade.createSwapTransaction({
        quoteResponse: quote,
        userPublicKey: sellerWallet.publicKey,
      });

      // Step 3: 签名并发送
      const signature = await this.signAndSendTransaction(swapResult.transaction, [sellerWallet]);
      
      console.log(`[Bags] Sell successful! TX: ${signature}`);

      // 将 lamports 转换为 SOL
      const receivedSOL = parseInt(quote.outAmount) / LAMPORTS_PER_SOL;

      return {
        success: true,
        txHash: signature,
        receivedAmount: receivedSOL.toString(),
      };

    } catch (error) {
      console.error('[Bags] Failed to sell token:', error);
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
      const slot = await this.connection.getSlot();
      return slot > 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取代币信息
   */
  async getTokenInfo(tokenAddress: string): Promise<any> {
    try {
      const sdk = this.initSDK();
      // SDK 可能提供状态查询方法
      const tokenMint = new PublicKey(tokenAddress);
      
      // 尝试获取代币状态
      // 注意：具体 API 可能需要根据 SDK 版本调整
      return {
        tokenMint: tokenAddress,
        // 其他信息需要根据 SDK API 获取
      };
    } catch (error) {
      console.error('[Bags] Failed to get token info:', error);
      return null;
    }
  }
}
