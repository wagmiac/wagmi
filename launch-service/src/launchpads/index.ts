/**
 * 发射台统一接口
 */

export { PumpFunLauncher } from './pumpfun.js';
export { FourMemeLauncher } from './fourmeme.js';
export { FlapLauncher } from './flap.js';
export { BagsLauncher } from './bags.js';

import { PumpFunLauncher } from './pumpfun.js';
import { FourMemeLauncher } from './fourmeme.js';
import { FlapLauncher } from './flap.js';
import { BagsLauncher } from './bags.js';
import type { 
  Launchpad, 
  TokenMetadata, 
  CreateTokenResponse, 
  BuyTokenResponse, 
  SellTokenResponse 
} from '../types.js';

// 发射台实例缓存
const launchers = {
  pumpfun: new PumpFunLauncher(),
  fourmeme: new FourMemeLauncher(),
  flapsh: new FlapLauncher(),
  bags: new BagsLauncher(),
};

/**
 * 获取发射台对应的 launcher
 */
function getLauncher(launchpad: Launchpad): PumpFunLauncher | FourMemeLauncher | FlapLauncher | BagsLauncher {
  switch (launchpad) {
    case 'pump.fun':
    case 'trends.fun':
      // Solana pump.fun 和 trends.fun
      return launchers.pumpfun;
    case 'bags.fm':
      // Bags.fm 使用独立 SDK
      return launchers.bags;
    case 'four.meme':
      return launchers.fourmeme;
    case 'flap.sh':
      return launchers.flapsh;
    default:
      throw new Error(`Unsupported launchpad: ${launchpad}`);
  }
}

/**
 * 统一的发射服务接口
 */
export const LaunchService = {
  /**
   * 创建代币并初始买入
   */
  async createAndBuy(
    launchpad: Launchpad,
    metadata: TokenMetadata,
    creatorPrivateKey: string,
    initialBuyAmount?: number,
    taxRate?: number
  ): Promise<CreateTokenResponse> {
    const launcher = getLauncher(launchpad);
    
    // 根据链类型设置默认买入金额
    const defaultAmount = ['pump.fun', 'trends.fun', 'bags.fm'].includes(launchpad)
      ? 0.0001  // SOL
      : 0.001;  // BNB
    
    // flap.sh 支持税率，需要特殊处理
    if (launchpad === 'flap.sh' && taxRate && taxRate > 0) {
      const flapLauncher = launcher as FlapLauncher;
      return flapLauncher.createAndBuyWithTax(
        metadata,
        creatorPrivateKey,
        taxRate,
        initialBuyAmount ?? defaultAmount
      );
    }
    
    return launcher.createAndBuy(
      metadata,
      creatorPrivateKey,
      initialBuyAmount ?? defaultAmount
    );
  },

  /**
   * 买入代币
   */
  async buy(
    launchpad: Launchpad,
    tokenAddress: string,
    buyerPrivateKey: string,
    amount: number
  ): Promise<BuyTokenResponse> {
    const launcher = getLauncher(launchpad);
    return launcher.buy(tokenAddress, buyerPrivateKey, amount);
  },

  /**
   * 卖出代币
   */
  async sell(
    launchpad: Launchpad,
    tokenAddress: string,
    sellerPrivateKey: string,
    tokenAmount: string
  ): Promise<SellTokenResponse> {
    const launcher = getLauncher(launchpad);
    return launcher.sell(tokenAddress, sellerPrivateKey, tokenAmount);
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    pumpfun: boolean;
    fourmeme: boolean;
    flapsh: boolean;
    bags: boolean;
  }> {
    const [pumpfun, fourmeme, flapsh, bags] = await Promise.all([
      launchers.pumpfun.healthCheck(),
      launchers.fourmeme.healthCheck(),
      launchers.flapsh.healthCheck(),
      launchers.bags.healthCheck(),
    ]);
    
    return { pumpfun, fourmeme, flapsh, bags };
  },
};
