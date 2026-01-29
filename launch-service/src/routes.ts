/**
 * 发射服务 API 路由
 */

import { Router, Request, Response } from 'express';
import { LaunchService } from './launchpads/index.js';
import { verifyTransaction, getTokenBalance, transferToken, transferNative, getNativeBalance } from './chain-utils.js';
import {
  verifySignature,
  verifyIPWhitelist,
  checkDailyLimit,
  checkAmountLimit,
  secureLogging,
} from './security.js';
import type { 
  Launchpad,
  CreateTokenRequest, 
  CreateTokenResponse,
  BuyTokenRequest,
  BuyTokenResponse,
  SellTokenRequest,
  SellTokenResponse,
  HealthResponse,
  VerifyTransactionRequest,
  VerifyTransactionResponse,
  TokenBalanceRequest,
  TokenBalanceResponse,
  TransferTokenRequest,
  TransferTokenResponse,
  TransferNativeRequest,
  TransferNativeResponse,
} from './types.js';

const router = Router();

// 安全中间件（按顺序执行）
const securityMiddleware = [
  verifyIPWhitelist,    // 1. IP 白名单
  verifySignature,      // 2. HMAC 签名验证
  secureLogging,        // 3. 安全日志
  checkDailyLimit,      // 4. 每日交易限制
  checkAmountLimit,     // 5. 金额限制
];

/**
 * 健康检查（无需认证）
 * GET /health
 */
router.get('/health', async (_req: Request, res: Response<HealthResponse>) => {
  try {
    const launchpadStatus = await LaunchService.healthCheck();
    
    const launchpads: HealthResponse['launchpads'] = [
      { name: 'pump.fun', chain: 'solana', available: launchpadStatus.pumpfun },
      { name: 'trends.fun', chain: 'solana', available: launchpadStatus.pumpfun }, // TODO: 实现后改为独立状态
      { name: 'bags.fm', chain: 'solana', available: launchpadStatus.bags },
      { name: 'four.meme', chain: 'bsc', available: launchpadStatus.fourmeme },
      { name: 'flap.sh', chain: 'bsc', available: launchpadStatus.flapsh },
    ];
    
    res.json({
      status: 'ok',
      version: '1.0.0',
      launchpads,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      version: '1.0.0',
      launchpads: [],
    });
  }
});

/**
 * 创建代币（需要认证）
 * POST /create
 * Body: CreateTokenRequest
 */
router.post('/create', ...securityMiddleware, async (req: Request<{}, {}, CreateTokenRequest>, res: Response<CreateTokenResponse>) => {
  try {
    const { launchpad, metadata, creatorPrivateKey, initialBuyAmount, taxRate } = req.body;
    
    // 验证必填参数
    if (!launchpad || !metadata || !creatorPrivateKey) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: launchpad, metadata, creatorPrivateKey',
      });
      return;
    }
    
    if (!metadata.name || !metadata.symbol || !metadata.description) {
      res.status(400).json({
        success: false,
        error: 'Missing required metadata fields: name, symbol, description',
      });
      return;
    }
    
    // 验证发射台
    const validLaunchpads: Launchpad[] = ['pump.fun', 'trends.fun', 'bags.fm', 'four.meme', 'flap.sh'];
    if (!validLaunchpads.includes(launchpad)) {
      res.status(400).json({
        success: false,
        error: `Invalid launchpad: ${launchpad}. Valid options: ${validLaunchpads.join(', ')}`,
      });
      return;
    }
    
    // 验证税率（仅 flap.sh 支持）
    if (taxRate && taxRate > 0 && launchpad !== 'flap.sh') {
      res.status(400).json({
        success: false,
        error: 'Tax rate is only supported on flap.sh',
      });
      return;
    }
    
    console.log(`[POST /create] Launching on ${launchpad}:`, {
      name: metadata.name,
      symbol: metadata.symbol,
      initialBuyAmount,
      taxRate: taxRate || 0,
    });
    
    const result = await LaunchService.createAndBuy(
      launchpad,
      metadata,
      creatorPrivateKey,
      initialBuyAmount,
      taxRate
    );
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('[POST /create] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 买入代币（需要认证）
 * POST /buy
 * Body: BuyTokenRequest
 */
router.post('/buy', ...securityMiddleware, async (req: Request<{}, {}, BuyTokenRequest>, res: Response<BuyTokenResponse>) => {
  try {
    const { launchpad, tokenAddress, amount, buyerPrivateKey } = req.body;
    
    if (!launchpad || !tokenAddress || !amount || !buyerPrivateKey) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: launchpad, tokenAddress, amount, buyerPrivateKey',
      });
      return;
    }
    
    console.log(`[POST /buy] Buying on ${launchpad}:`, {
      tokenAddress,
      amount,
    });
    
    const result = await LaunchService.buy(
      launchpad,
      tokenAddress,
      buyerPrivateKey,
      amount
    );
    
    res.json(result);
  } catch (error) {
    console.error('[POST /buy] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 卖出代币（需要认证）
 * POST /sell
 * Body: SellTokenRequest
 */
router.post('/sell', ...securityMiddleware, async (req: Request<{}, {}, SellTokenRequest>, res: Response<SellTokenResponse>) => {
  try {
    const { launchpad, tokenAddress, tokenAmount, sellerPrivateKey } = req.body;
    
    if (!launchpad || !tokenAddress || !tokenAmount || !sellerPrivateKey) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: launchpad, tokenAddress, tokenAmount, sellerPrivateKey',
      });
      return;
    }
    
    console.log(`[POST /sell] Selling on ${launchpad}:`, {
      tokenAddress,
      tokenAmount,
    });
    
    const result = await LaunchService.sell(
      launchpad,
      tokenAddress,
      sellerPrivateKey,
      tokenAmount
    );
    
    res.json(result);
  } catch (error) {
    console.error('[POST /sell] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========== 验证与工具接口 ==========

/**
 * 验证交易（需要认证）
 * POST /verify-transaction
 */
router.post('/verify-transaction', ...securityMiddleware, async (req: Request<{}, {}, VerifyTransactionRequest>, res: Response<VerifyTransactionResponse>) => {
  try {
    const { chain, txHash, expectedTo, expectedAmount } = req.body;
    
    if (!chain || !txHash || !expectedTo || expectedAmount === undefined) {
      res.status(400).json({
        success: false,
        verified: false,
        confirmed: false,
        error: 'Missing required fields: chain, txHash, expectedTo, expectedAmount',
      });
      return;
    }
    
    console.log(`[POST /verify-transaction] Verifying ${chain} tx:`, txHash.substring(0, 20) + '...');
    
    const result = await verifyTransaction(chain, txHash, expectedTo, expectedAmount);
    res.json(result);
  } catch (error) {
    console.error('[POST /verify-transaction] Error:', error);
    res.status(500).json({
      success: false,
      verified: false,
      confirmed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 查询代币余额（需要认证）
 * POST /token-balance
 */
router.post('/token-balance', ...securityMiddleware, async (req: Request<{}, {}, TokenBalanceRequest>, res: Response<TokenBalanceResponse>) => {
  try {
    const { chain, tokenAddress, walletAddress } = req.body;
    
    if (!chain || !tokenAddress || !walletAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: chain, tokenAddress, walletAddress',
      });
      return;
    }
    
    console.log(`[POST /token-balance] Querying ${chain} token balance:`, tokenAddress.substring(0, 10) + '...');
    
    const result = await getTokenBalance(chain, tokenAddress, walletAddress);
    res.json(result);
  } catch (error) {
    console.error('[POST /token-balance] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 转账代币（需要认证）
 * POST /transfer-token
 */
router.post('/transfer-token', ...securityMiddleware, async (req: Request<{}, {}, TransferTokenRequest>, res: Response<TransferTokenResponse>) => {
  try {
    const { chain, tokenAddress, fromPrivateKey, toAddress, amount } = req.body;
    
    if (!chain || !tokenAddress || !fromPrivateKey || !toAddress || !amount) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: chain, tokenAddress, fromPrivateKey, toAddress, amount',
      });
      return;
    }
    
    console.log(`[POST /transfer-token] Transferring ${chain} token to:`, toAddress.substring(0, 10) + '...');
    
    const result = await transferToken(chain, tokenAddress, fromPrivateKey, toAddress, amount);
    res.json(result);
  } catch (error) {
    console.error('[POST /transfer-token] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 转账原生代币（需要认证，用于退款）
 * POST /transfer-native
 */
router.post('/transfer-native', ...securityMiddleware, async (req: Request<{}, {}, TransferNativeRequest>, res: Response<TransferNativeResponse>) => {
  try {
    const { chain, fromPrivateKey, toAddress, amount } = req.body;
    
    if (!chain || !fromPrivateKey || !toAddress || amount === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: chain, fromPrivateKey, toAddress, amount',
      });
      return;
    }
    
    console.log(`[POST /transfer-native] Transferring ${amount} ${chain === 'solana' ? 'SOL' : 'BNB'} to:`, toAddress.substring(0, 10) + '...');
    
    const result = await transferNative(chain, fromPrivateKey, toAddress, amount);
    res.json(result);
  } catch (error) {
    console.error('[POST /transfer-native] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 查询原生代币余额（无需认证）
 * GET /balance/:chain/:address
 */
router.get('/balance/:chain/:address', async (req: Request, res: Response) => {
  try {
    const { chain, address } = req.params;
    
    if (chain !== 'solana' && chain !== 'bsc') {
      res.status(400).json({ success: false, error: 'Invalid chain' });
      return;
    }
    
    const balance = await getNativeBalance(chain, address);
    res.json({ success: true, balance });
  } catch (error) {
    console.error('[GET /balance] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
