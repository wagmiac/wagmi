# WAGMI IMO Platform

WAGMI IMO (Initial Meme Offering) 是一个社区驱动的 Meme 币发射平台。

**核心理念：社区可以给任何项目发 Meme 币！**

## 🚀 功能特性

- 🔍 **发掘 (Discover)**: 伯乐支付 $99 发掘有潜力的项目
- 💰 **竞拍 (Auction)**: 社区成员竞拍代币发射权
- 🚀 **发射 (Launch)**: 赢家在 pump.fun/trends.fun/bags.fm/flap.sh 发射代币
- 💎 **分成 (Revenue)**: Creator 70%, Scout 10%, Platform 20%

## 支持的链

| 链 | 发射台 |
|---|---|
| Solana | pump.fun, trends.fun, bags.fm |
| BSC | flap.sh |

## 项目结构

```
wagmi/
├── content-engine/    # Go 后端服务
├── frontend/          # Next.js 前端应用
└── docs/              # 设计文档
```

## 技术栈

### 后端 (content-engine)
- **语言**: Go 1.21+
- **框架**: Gin
- **ORM**: GORM
- **数据库**: PostgreSQL

### 前端 (frontend)
- **框架**: Next.js 15+ (App Router)
- **语言**: TypeScript
- **UI**: React 19, Tailwind CSS
- **钱包**: Phantom, Solflare, MetaMask

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/wagmiac/wagmi.git
cd wagmi
```

### 2. 启动后端

```bash
cd content-engine
cp .env.example .env
# 编辑 .env 配置数据库
go run cmd/server/main.go
```

### 3. 启动前端

```bash
cd frontend
cp .env.example .env.local
# 编辑 .env.local 配置 API 地址
npm install
npm run dev
```

## 环境变量

### 后端 (.env)
```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=wagmi_imo
JWT_SECRET=your_jwt_secret
WALLET_ENCRYPTION_KEY=your_32_byte_key
PLATFORM_WALLET=your_wallet_address
```

### 前端 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## API 文档

### IMO 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/imo/projects` | 项目列表 |
| GET | `/api/imo/projects/ticker/:ticker` | 获取项目 |
| POST | `/api/imo/projects` | 发掘项目 |
| POST | `/api/imo/projects/:id/bids` | 出价 |
| GET | `/api/imo/projects/:id/timeline` | 时间线 |
| GET | `/api/imo/stats` | 统计数据 |
| GET | `/api/imo/wallet/nonce` | 获取签名 nonce |
| POST | `/api/imo/wallet/verify` | 验证钱包 |

## 部署

详见 [DEPLOY.md](./DEPLOY.md)

## License

MIT

详细部署说明请参考各子项目的 README。

## License

MIT
