# WAGMI - Web3 Creative Tokenization Platform

<p align="center">
  <strong>🚀 Let every idea be seen, let every contribution be rewarded</strong>
</p>

<p align="center">
  <a href="https://wagmi.ac">Website</a> •
  <a href="https://twitter.com/wagmiac">Twitter</a> •
  <a href="https://t.me/wagmiac">Telegram</a>
</p>

<p align="center">
  <a href="./README.md">中文</a> | English
</p>

---

## 📖 Introduction

WAGMI is a community-driven Web3 creative tokenization platform. Our core philosophy is **empowering communities to launch Meme tokens for any promising project**.

Through our innovative IMO (Initial Meme Offering) mechanism, WAGMI enables:
- 🔍 **Discover Projects** - Scouts find and submit promising projects
- 🚀 **One-Click Token Launch** - Multi-chain, multi-platform token launches
- 💰 **Fair Revenue Distribution** - Creator 70%, Scout 10%, Platform 20%
- 🎯 **Community Benefits** - Early participants share in project growth

## 🌐 Supported Chains & Launchpads

| Chain | Launchpad | Features |
|---|---|---|
| **Solana** | pump.fun | Leading Meme launchpad |
| **Solana** | trends.fun | Trending token launches |
| **Solana** | bags.fm | Fee sharing support |
| **BSC** | flap.sh | Tax token support (1%/3%) |
| **BSC** | four.meme | BSC Meme launchpad |

## 📁 Project Structure

```
wagmi/
├── content-engine/     # Go backend service (API + business logic)
├── launch-service/     # Node.js launch service (on-chain interactions)
├── frontend/           # Next.js frontend application
├── docs/               # Design documents
├── DEPLOY.md           # Deployment guide
└── README.md
```

## 🛠️ Tech Stack

### Backend Service (content-engine)
| Component | Technology |
|-----------|------------|
| Language | Go 1.21+ |
| Framework | Gin |
| ORM | GORM |
| Database | PostgreSQL |
| Auth | JWT + Wallet Signature |
| Scheduler | Built-in Scheduler |

### Launch Service (launch-service)
| Component | Technology |
|-----------|------------|
| Language | TypeScript |
| Runtime | Node.js 20+ |
| Framework | Express |
| Solana | @solana/web3.js, @coral-xyz/anchor |
| BSC | ethers.js v6 |
| Security | HMAC signature, IP whitelist |

### Frontend Application (frontend)
| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS |
| Wallets | Phantom, Solflare, MetaMask, OKX |
| State | React Hooks |

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/wagmiac/wagmi.git
cd wagmi
```

### 2. Start Backend (content-engine)

```bash
cd content-engine
cp .env.example .env
# Edit .env to configure database and keys
go run cmd/server/main.go
```

### 3. Start Launch Service (launch-service)

```bash
cd launch-service
cp .env.example .env
# Edit .env to configure RPC and keys
npm install
npm run build
npm start
```

### 4. Start Frontend (frontend)

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local to configure API URL
npm install
npm run dev
```

Visit http://localhost:3000 to view the application

## ⚙️ Environment Variables

### content-engine/.env
```env
# Service config
PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=wagmi

# Security
JWT_SECRET=your_jwt_secret
WALLET_ENCRYPTION_KEY=your_32_byte_hex_key

# Launch service
LAUNCH_SERVICE_URL=http://localhost:3001
LAUNCH_SERVICE_SECRET=your_hmac_secret

# Platform wallets
PLATFORM_WALLET_SOL=your_solana_wallet
PLATFORM_WALLET_BSC=your_bsc_wallet
```

### launch-service/.env
```env
# Service port
PORT=3001

# RPC nodes
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Proxy (optional)
HTTP_PROXY=

# Security
API_SECRET=your_hmac_secret
IP_WHITELIST=127.0.0.1,::1

# Transaction config
SLIPPAGE_BPS=100
PRIORITY_FEE_UNIT_PRICE=250000
```

### frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 📡 API Overview

### IMO Project Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/imo/projects` | List projects |
| GET | `/api/imo/projects/ticker/:ticker` | Get project details |
| POST | `/api/imo/projects` | Submit new project |
| POST | `/api/imo/projects/:id/bids` | Place bid |
| GET | `/api/imo/projects/:id/timeline` | Project timeline |

### Launch Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/imo/admin/projects/:id/launch-with-payment` | Launch token |
| GET | `/api/imo/admin/launch-orders` | List launch orders |

### Wallet Authentication
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/imo/wallet/nonce` | Get signing nonce |
| POST | `/api/imo/wallet/verify` | Verify wallet signature |

### Launch Service (launch-service)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/create` | Create token |
| POST | `/api/buy` | Buy token |
| POST | `/api/sell` | Sell token |
| POST | `/api/token-balance` | Query token balance |
| POST | `/api/transfer-token` | Transfer token |

## 🔐 Security

1. **HMAC Signature Verification** - Launch-service APIs require HMAC-SHA256 signatures
2. **IP Whitelist** - Only whitelisted IPs can access launch service
3. **Wallet Signature Auth** - Users authenticate via wallet signatures
4. **Encrypted Private Keys** - Private keys stored with AES-GCM encryption

## 📦 Deployment

See [DEPLOY.md](./DEPLOY.md) for details

### Production Checklist
- [ ] Configure production database
- [ ] Configure production RPC nodes
- [ ] Set strong passwords and keys
- [ ] Configure HTTPS
- [ ] Configure IP whitelist
- [ ] Set up logging and monitoring

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

---

<p align="center">
  <strong>WAGMI - We're All Gonna Make It! 🌙</strong>
</p>
