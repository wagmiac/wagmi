# WAGMI Web Frontend

WAGMI 平台前端应用，基于 Next.js 16 构建。

## 技术栈

- **Next.js** 16+ (App Router, Turbopack)
- **React** 19
- **TypeScript** 5
- **Tailwind CSS** 4
- **wagmi** + **viem** (Web3 钱包连接)

## 功能模块

- 🪙 **代币展示**: 代币列表、详情页、交易链接
- 📝 **内容浏览**: 文章列表、阅读、评论
- 👤 **用户系统**: 钱包登录、OAuth 登录
- 🔔 **通知系统**: 实时通知、未读提醒
- 🌐 **国际化**: 中英文切换
- 🎨 **主题**: 深色模式

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
NEXT_PUBLIC_CONTENT_API_URL=http://localhost:8080/api
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3209

## 项目结构

```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (home)/             # 首页
│   │   ├── tokens/             # 代币模块
│   │   │   ├── page.tsx        # 代币列表
│   │   │   └── [id]/           # 代币详情
│   │   ├── admin/              # 管理后台
│   │   │   └── tokens/         # 代币管理
│   │   └── api/                # API 路由
│   ├── components/             # 通用组件
│   │   ├── Navigation.tsx      # 导航栏
│   │   └── WalletConnect.tsx   # 钱包连接
│   ├── lib/                    # 工具库
│   │   ├── i18n.tsx            # 国际化
│   │   ├── token-api.ts        # 代币 API
│   │   └── auth-context.tsx    # 认证上下文
│   └── providers/              # React Providers
├── public/                     # 静态资源
├── next.config.ts              # Next.js 配置
├── tailwind.config.ts          # Tailwind 配置
└── package.json
```

## 构建部署

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务

```bash
pnpm start
```

### 使用 PM2 管理

```bash
pm2 start npm --name "wagmi-frontend" -- start
```

## 环境变量

| 变量名 | 说明 | 示例 |
|-------|------|------|
| `NEXT_PUBLIC_CONTENT_API_URL` | 后端 API 地址 | `http://localhost:8080/api` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect 项目 ID | `your_project_id` |

## 开发指南

### 添加新页面

1. 在 `src/app/` 下创建目录和 `page.tsx`
2. 使用 `useI18n()` 获取翻译函数
3. 在 `src/lib/i18n.tsx` 添加翻译文本

### 调用后端 API

```typescript
import { getPublishedTokens } from '@/lib/token-api';

const tokens = await getPublishedTokens();
```

## License

MIT
