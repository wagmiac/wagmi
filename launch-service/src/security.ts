/**
 * 安全中间件
 * - HMAC 签名验证
 * - IP 白名单
 * - 请求频率限制
 * - 交易限额检查
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { CONFIG } from './config.js';

// 每日交易计数器
interface DailyCounter {
  date: string;
  count: number;
}

const dailyTxCounter: Map<string, DailyCounter> = new Map();

/**
 * 获取今日日期字符串
 */
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 验证 HMAC 签名
 * 
 * 签名算法：
 * 1. 将请求 body JSON 序列化（按 key 排序）
 * 2. 拼接时间戳：`${timestamp}.${bodyJson}`
 * 3. 使用 HMAC-SHA256 计算签名
 * 
 * 请求头：
 * - X-Signature: HMAC 签名（hex）
 * - X-Timestamp: Unix 时间戳（秒）
 */
export function verifySignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  
  if (!signature || !timestamp) {
    res.status(401).json({
      success: false,
      error: 'Missing signature or timestamp header',
    });
    return;
  }
  
  // 验证时间戳（5分钟有效期）
  const now = Math.floor(Date.now() / 1000);
  const reqTime = parseInt(timestamp, 10);
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 300) {
    res.status(401).json({
      success: false,
      error: 'Request timestamp expired or invalid',
    });
    return;
  }
  
  // 计算签名
  const bodyJson = JSON.stringify(sortObjectKeys(req.body));
  const payload = `${timestamp}.${bodyJson}`;
  const expectedSignature = crypto
    .createHmac('sha256', CONFIG.apiSecret)
    .update(payload)
    .digest('hex');
  
  // 安全比较（先检查长度，避免 timingSafeEqual 报错）
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  
  if (sigBuffer.length !== expectedBuffer.length || 
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    console.warn('[Security] Invalid signature from', getClientIP(req));
    res.status(401).json({
      success: false,
      error: 'Invalid signature',
    });
    return;
  }
  
  next();
}

/**
 * IP 白名单验证
 */
export function verifyIPWhitelist(req: Request, res: Response, next: NextFunction): void {
  const clientIP = getClientIP(req);
  
  // 检查是否在白名单中
  const isAllowed = CONFIG.allowedIPs.some(allowed => {
    // 支持通配符 * 表示允许所有
    if (allowed === '*') return true;
    // 精确匹配
    return clientIP === allowed || clientIP.includes(allowed);
  });
  
  if (!isAllowed) {
    console.warn('[Security] Blocked request from unauthorized IP:', clientIP);
    res.status(403).json({
      success: false,
      error: 'IP not allowed',
    });
    return;
  }
  
  next();
}

/**
 * 每日交易次数限制
 */
export function checkDailyLimit(req: Request, res: Response, next: NextFunction): void {
  const today = getTodayStr();
  const key = 'global'; // 可以改为按钱包地址限制
  
  let counter = dailyTxCounter.get(key);
  
  // 重置过期计数器
  if (!counter || counter.date !== today) {
    counter = { date: today, count: 0 };
    dailyTxCounter.set(key, counter);
  }
  
  if (counter.count >= CONFIG.limits.maxDailyTxCount) {
    console.warn('[Security] Daily transaction limit exceeded');
    res.status(429).json({
      success: false,
      error: `Daily transaction limit exceeded (max: ${CONFIG.limits.maxDailyTxCount})`,
    });
    return;
  }
  
  // 增加计数
  counter.count++;
  
  next();
}

/**
 * 交易金额限制检查
 */
export function checkAmountLimit(req: Request, res: Response, next: NextFunction): void {
  const { launchpad, amount, initialBuyAmount } = req.body;
  
  // 确定使用的金额
  const txAmount = amount || initialBuyAmount || 0;
  
  // 根据链类型检查限额
  const isSolana = ['pump.fun', 'trends.fun', 'bags.fm'].includes(launchpad);
  const maxAmount = isSolana ? CONFIG.limits.maxBuyAmountSOL : CONFIG.limits.maxBuyAmountBNB;
  const currency = isSolana ? 'SOL' : 'BNB';
  
  if (txAmount > maxAmount) {
    console.warn(`[Security] Amount ${txAmount} ${currency} exceeds limit ${maxAmount}`);
    res.status(400).json({
      success: false,
      error: `Amount exceeds limit: max ${maxAmount} ${currency} per transaction`,
    });
    return;
  }
  
  next();
}

/**
 * 隐藏敏感信息的日志中间件
 */
export function secureLogging(req: Request, res: Response, next: NextFunction): void {
  // 克隆请求体用于日志
  const logBody = { ...req.body };
  
  // 隐藏私钥
  if (logBody.creatorPrivateKey) {
    logBody.creatorPrivateKey = `***${logBody.creatorPrivateKey.slice(-8)}`;
  }
  if (logBody.buyerPrivateKey) {
    logBody.buyerPrivateKey = `***${logBody.buyerPrivateKey.slice(-8)}`;
  }
  if (logBody.sellerPrivateKey) {
    logBody.sellerPrivateKey = `***${logBody.sellerPrivateKey.slice(-8)}`;
  }
  
  console.log(`[Request] ${req.method} ${req.path}`, JSON.stringify(logBody));
  
  next();
}

/**
 * 获取客户端 IP
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * 按 key 排序对象（用于签名一致性）
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item as Record<string, unknown>)) as unknown as Record<string, unknown>;
  }
  
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys(obj[key] as Record<string, unknown>);
  }
  return sorted;
}

/**
 * 生成签名（供 Go 后端使用的参考实现）
 */
export function generateSignature(body: Record<string, unknown>, timestamp: number): string {
  const bodyJson = JSON.stringify(sortObjectKeys(body));
  const payload = `${timestamp}.${bodyJson}`;
  return crypto
    .createHmac('sha256', CONFIG.apiSecret)
    .update(payload)
    .digest('hex');
}
