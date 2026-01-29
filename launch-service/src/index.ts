/**
 * 发射服务入口
 * 
 * 这是一个 Node.js 微服务，用于处理各发射台的 API 集成
 * Go 后端通过 HTTP 调用此服务来执行代币发射操作
 */

// 首先加载 .env 文件，确保环境变量在使用前就绑定
import { config as loadEnv } from 'dotenv';
loadEnv();

// 然后配置全局代理，确保所有 fetch 请求都走代理
import { ProxyAgent, setGlobalDispatcher } from 'undici';
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy;
if (httpProxy) {
  const proxyAgent = new ProxyAgent(httpProxy);
  setGlobalDispatcher(proxyAgent);
  console.log(`[Proxy] Global proxy configured: ${httpProxy}`);
}

import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import routes from './routes.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 支持大图片上传

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// API 路由
app.use('/api', routes);

// 根路径
app.get('/', (_req, res) => {
  res.json({
    name: 'WAGMI Launch Service',
    version: '1.0.0',
    description: 'Microservice for launchpad API integrations',
    endpoints: {
      health: 'GET /api/health',
      create: 'POST /api/create',
      buy: 'POST /api/buy',
      sell: 'POST /api/sell',
    },
  });
});

// 404 处理
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
  });
});

// 启动服务
const PORT = CONFIG.servicePort;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  WAGMI Launch Service                     ║
╠══════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                 ║
║                                                          ║
║  Endpoints:                                              ║
║    GET  /api/health  - Health check                      ║
║    POST /api/create  - Create token                      ║
║    POST /api/buy     - Buy token                         ║
║    POST /api/sell    - Sell token                        ║
║                                                          ║
║  Supported Launchpads:                                   ║
║    Solana: pump.fun, trends.fun, bags.fm                 ║
║    BSC:    four.meme, flap.sh                            ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
