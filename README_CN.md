# WAGMI - Web3 创意代币化平台

<p align="center">
  <strong>🚀 让每一个创意都能被看见，让每一份贡献都能被回报</strong>
</p>

<p align="center">
  <a href="https://wagmi.ac">官网</a> •
  <a href="https://twitter.com/wagmiac">Twitter</a> •
  <a href="https://t.me/wagmiac">Telegram</a>
</p>

<p align="center">
  <a href="./README.md">English</a> | 中文
</p>

---

## 📖 项目简介

WAGMI 是一个社区驱动的 Web3 创意代币化平台，核心理念是**让社区可以给任何有潜力的项目发行 Meme 代币**。

通过创新的 IMO (Initial Meme Offering) 机制，WAGMI 实现了：
- 🔍 **发掘好项目** - 伯乐发现并提交有潜力的项目
- 🚀 **一键发射代币** - 支持多链多平台代币发射
- 💰 **收益公平分配** - Creator 70%, Scout 10%, Platform 20%
- 🎯 **社区共同受益** - 让早期参与者分享项目成长

## 🌐 支持的链与发射台

| 链 | 发射台 | 特性 |
|---|---|---|
| **Solana** | pump.fun | 主流 Meme 发射台 |
| **Solana** | trends.fun | 趋势代币发射 |
| **Solana** | bags.fm | 费用分成支持 |
| **BSC** | flap.sh | 支持税率代币 (1%/3%) |
| **BSC** | four.meme | BSC Meme 发射台 |

## 📁 项目结构

```
wagmi/
├── content-engine/     # Go 后端服务 (API + 业务逻辑)
├── launch-service/     # Node.js 发射服务 (链上交互)
├── frontend/           # Next.js 前端应用
├── docs/               # 设计文档
├── DEPLOY.md           # 部署说明
└── README.md
```

## 🛠️ 技术栈

### 后端服务 (content-engine)
| 组件 | 技术 |
|------|------|
| 语言 | Go 1.21+ |
| 框架 | Gin |
| ORM | GORM |
| 数据库 | PostgreSQL |
| 认证 | JWT + 钱包签名 |
| 调度 | 内置 Scheduler |

### 发射服务 (launch-service)
| 组件 | 技术 |
|------|------|
| 语言 | TypeScript |
| 运行时 | Node.js 20+ |
| 框架 | Express |
| Solana | @solana/web3.js, @coral-xyz/anchor |
| BSC | ethers.js v6 |
| 安全 | HMAC 签名验证, IP 白名单 |

### 前端应用 (frontend)
| 组件 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript |
| UI | React 19, Tailwind CSS |
| 钱包 | Phantom, Solflare, MetaMask, OKX |
| 状态 | React Hooks |

## 🚀 快速开始

### 环境要求
- Go 1.21+
- Node.js 20+
- PostgreSQL 14+
- npm 或 yarn

### 1. 克隆仓库

```bash
git clone https://github.com/wagmiac/wagmi.git
cd wagmi
```

### 2. 启动后端 (content-engine)

```bash
cd content-engine
cp .env.example .env
# 编辑 .env 配置数据库和密钥
go run cmd/server/main.go
```

### 3. 启动发射服务 (launch-service)

```bash
cd launch-service
cp .env.example .env
# 编辑 .env 配置 RPC 和密钥
npm install
npm run build
npm start
```

### 4. 启动前端 (frontend)

```bash
cd frontend
cp .env.example .env.local
# 编辑 .env.local 配置 API 地址
npm install
npm run dev
```

访问 http://localhost:3000 查看应用

## ⚙️ 环境变量配置

### content-engine/.env
```env
# 服务配置
PORT=8080

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=wagmi

# 安全
JWT_SECRET=your_jwt_secret
WALLET_ENCRYPTION_KEY=your_32_byte_hex_key

# 发射服务
LAUNCH_SERVICE_URL=http://localhost:3001
LAUNCH_SERVICE_SECRET=your_hmac_secret

# 平台钱包
PLATFORM_WALLET_SOL=your_solana_wallet
PLATFORM_WALLET_BSC=your_bsc_wallet
```

### launch-service/.env
```env
# 服务端口
PORT=3001

# RPC 节点
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
BSC_RPC_URL=https://bsc-dataseed.binance.org

# 代理 (可选)
HTTP_PROXY=

# 安全
API_SECRET=your_hmac_secret
IP_WHITELIST=127.0.0.1,::1

# 交易配置
SLIPPAGE_BPS=100
PRIORITY_FEE_UNIT_PRICE=250000
```

### frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 📡 API 概览

### IMO 项目接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/imo/projects` | 项目列表 |
| GET | `/api/imo/projects/ticker/:ticker` | 获取项目详情 |
| POST | `/api/imo/projects` | 发掘新项目 |
| POST | `/api/imo/projects/:id/bids` | 竞拍出价 |
| GET | `/api/imo/projects/:id/timeline` | 项目时间线 |

### 发射接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/imo/admin/projects/:id/launch-with-payment` | 发射代币 |
| GET | `/api/imo/admin/launch-orders` | 发射订单列表 |

### 钱包认证
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/imo/wallet/nonce` | 获取签名 nonce |
| POST | `/api/imo/wallet/verify` | 验证钱包签名 |

### 发射服务 (launch-service)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/create` | 创建代币 |
| POST | `/api/buy` | 买入代币 |
| POST | `/api/sell` | 卖出代币 |
| POST | `/api/token-balance` | 查询代币余额 |
| POST | `/api/transfer-token` | 转账代币 |

## 🔐 安全机制

1. **HMAC 签名验证** - launch-service 接口需要 HMAC-SHA256 签名
2. **IP 白名单** - 仅允许指定 IP 访问发射服务
3. **钱包签名认证** - 用户通过钱包签名登录
4. **私钥加密存储** - 使用 AES-GCM 加密存储私钥

## 📦 部署

详见 [DEPLOY.md](./DEPLOY.md)

### 生产环境检查清单
- [ ] 配置生产数据库
- [ ] 配置正式 RPC 节点
- [ ] 设置强密码和密钥
- [ ] 配置 HTTPS
- [ ] 配置 IP 白名单
- [ ] 设置日志和监控

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

<p align="center">
  <strong>WAGMI - We're All Gonna Make It! 🌙</strong>
</p>
