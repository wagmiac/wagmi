# WAGMI Launch Service

Node.js 微服务，用于处理各发射台的 API 集成。Go 后端通过 HTTP 调用此服务来执行代币发射操作。

## 支持的发射台

### Solana
- **pump.fun** - 主流 Solana meme coin 发射台
- **trends.fun** - 趋势代币发射台
- **bags.fm** - 社区代币发射台

### BSC
- **four.meme** - BSC 上的 meme coin 发射台
- **flap.sh** - BSC 上的代币发射台

## 安装

```bash
cd launch-service
npm install
```

## 配置

创建 `.env` 文件：

```env
# 服务端口
PORT=3001

# Solana RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# BSC RPC
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Jito (可选，用于快速交易)
JITO_URL=

# 优先费 (Solana)
PRIORITY_FEE_UNIT_LIMIT=250000
PRIORITY_FEE_UNIT_PRICE=250000

# 滑点 (基点，100 = 1%)
SLIPPAGE_BPS=100

# API 密钥
API_SECRET=your-api-secret
```

## 运行

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm run build
npm start
```

## API 接口

### 健康检查
```
GET /api/health
```

响应示例：
```json
{
  "status": "ok",
  "version": "1.0.0",
  "launchpads": [
    {"name": "pump.fun", "chain": "solana", "available": true},
    {"name": "four.meme", "chain": "bsc", "available": true}
  ]
}
```

### 创建代币
```
POST /api/create
Content-Type: application/json

{
  "launchpad": "pump.fun",
  "metadata": {
    "name": "My Token",
    "symbol": "MTK",
    "description": "A cool token",
    "image": "https://example.com/logo.png",
    "twitter": "https://twitter.com/mytoken",
    "telegram": "https://t.me/mytoken",
    "website": "https://mytoken.com"
  },
  "creatorPrivateKey": "hex-encoded-private-key",
  "initialBuyAmount": 0.1
}
```

响应示例：
```json
{
  "success": true,
  "tokenAddress": "So1234...abcd",
  "createTxHash": "5xYz...",
  "pumpFunUrl": "https://pump.fun/So1234...abcd"
}
```

### 买入代币
```
POST /api/buy
Content-Type: application/json

{
  "launchpad": "pump.fun",
  "tokenAddress": "So1234...abcd",
  "amount": 0.5,
  "buyerPrivateKey": "hex-encoded-private-key"
}
```

### 卖出代币
```
POST /api/sell
Content-Type: application/json

{
  "launchpad": "pump.fun",
  "tokenAddress": "So1234...abcd",
  "tokenAmount": "1000000",
  "sellerPrivateKey": "hex-encoded-private-key"
}
```

## 与 Go 后端集成

在 Go 后端的 `.env` 中配置：

```env
LAUNCH_SERVICE_URL=http://localhost:3001
```

Go 后端会自动调用此服务的 `/api/create` 接口来执行代币发射。

## 开发说明

### 添加新发射台

1. 在 `src/launchpads/` 目录创建新的集成文件
2. 实现 `createAndBuy`, `buy`, `sell`, `healthCheck` 方法
3. 在 `src/launchpads/index.ts` 中注册

### SDK 使用

- **pump.fun**: 使用 `pumpdotfun-repumped-sdk`
- **BSC**: 使用 `ethers` 与合约交互
