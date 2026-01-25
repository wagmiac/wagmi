# WAGMI Platform

WAGMI 是一个 Web3 代币管理和内容发布平台，提供代币信息展示、内容管理、AI 辅助等功能。

## 项目结构

```
wagmi/
├── content-engine/    # Go 后端服务
└── web/               # Next.js 前端应用
```

## 技术栈

### 后端 (content-engine)
- **语言**: Go 1.21+
- **框架**: Gin
- **ORM**: GORM
- **数据库**: PostgreSQL
- **AI**: POE API / Grok API

### 前端 (web)
- **框架**: Next.js 16+ (App Router)
- **语言**: TypeScript
- **UI**: React 19, Tailwind CSS
- **状态管理**: React Context
- **国际化**: 自定义 i18n

## 功能特性

- 🪙 **代币管理**: 创建、发布、管理代币信息
- 📝 **内容引擎**: AI 辅助内容创作和管理
- 🔐 **多登录方式**: 钱包登录、Google、Twitter OAuth
- 🌐 **国际化**: 中英文双语支持
- 🎨 **现代 UI**: 深色主题，响应式设计

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/wagmi.git
cd wagmi
```

### 2. 启动后端

```bash
cd content-engine
cp .env.example .env
# 编辑 .env 配置数据库和 API 密钥
go run cmd/server/main.go
```

### 3. 启动前端

```bash
cd web
cp .env.example .env.local
# 编辑 .env.local 配置 API 地址
pnpm install
pnpm dev
```

## 环境变量

### 后端 (.env)
```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=wagmi
POE_API_KEY=your_poe_api_key
```

### 前端 (.env.local)
```env
NEXT_PUBLIC_CONTENT_API_URL=http://localhost:8080/api
```

## 部署

详细部署说明请参考各子项目的 README。

## License

MIT
