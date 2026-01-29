// 注意：dotenv 已在 index.ts 入口处加载，这里直接使用 process.env

export const CONFIG = {
  // 服务配置
  servicePort: parseInt(process.env.PORT || '3001', 10),
  
  // Solana
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // BSC
  bscRpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
  
  // API 认证
  apiSecret: process.env.API_SECRET || 'wagmi-launch-service-secret-2026',
  
  // 允许的请求来源 IP（逗号分隔）
  allowedIPs: (process.env.ALLOWED_IPS || '127.0.0.1,::1,localhost').split(','),
  
  // Jito 配置（Solana 快速交易）
  jitoUrl: process.env.JITO_URL,
  
  // 优先费（Solana）
  priorityFee: {
    unitLimit: parseInt(process.env.PRIORITY_FEE_UNIT_LIMIT || '250000', 10),
    unitPrice: parseInt(process.env.PRIORITY_FEE_UNIT_PRICE || '250000', 10),
  },
  
  // 滑点（基点，500 = 5%，对于小额买入需要更高的滑点容忍度）
  slippageBps: BigInt(process.env.SLIPPAGE_BPS || '500'),
  
  // HTTP 代理（可选）
  httpProxy: process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy,
  
  // 交易限额（设为极大值表示不限制）
  limits: {
    maxBuyAmountSOL: parseFloat(process.env.MAX_BUY_AMOUNT_SOL || '999999'),
    maxBuyAmountBNB: parseFloat(process.env.MAX_BUY_AMOUNT_BNB || '999999'),
    maxDailyTxCount: parseInt(process.env.MAX_DAILY_TX_COUNT || '999999', 10),
  },
};
