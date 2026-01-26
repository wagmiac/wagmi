# WAGMI IMO 部署说明

## 环境要求

- Go 1.21+
- Node.js 18+
- PostgreSQL 14+

## 后端部署

### 1. 配置环境变量

```bash
# 复制示例配置
cp content-engine/.env.example content-engine/.env

# 编辑配置
nano content-engine/.env
```

必需的环境变量：

```env
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=wagmi_imo

# JWT
JWT_SECRET=your_jwt_secret_key

# 发射相关
WALLET_ENCRYPTION_KEY=your_32_byte_encryption_key
PLATFORM_WALLET=your_platform_wallet_address
SOLANA_RPC=https://api.mainnet-beta.solana.com
BSC_RPC=https://bsc-dataseed.binance.org

# CORS
ALLOWED_ORIGINS=https://wagmi.fun,https://www.wagmi.fun

# 前端
FRONTEND_URL=https://wagmi.fun
```

### 2. 编译

```bash
cd content-engine
go build -o wagmi_server ./cmd/server
```

### 3. 运行

```bash
./wagmi_server
```

### 4. 使用 systemd 管理（Linux）

```bash
sudo nano /etc/systemd/system/wagmi.service
```

```ini
[Unit]
Description=WAGMI IMO Server
After=network.target postgresql.service

[Service]
Type=simple
User=wagmi
WorkingDirectory=/opt/wagmi/content-engine
ExecStart=/opt/wagmi/content-engine/wagmi_server
Restart=always
RestartSec=5
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable wagmi
sudo systemctl start wagmi
```

## 前端部署

### 1. 配置环境变量

```bash
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.wagmi.fun/api
NEXT_PUBLIC_BASE_URL=https://wagmi.fun
```

### 2. 构建

```bash
cd frontend
npm install
npm run build
```

### 3. 运行

```bash
npm start
# 或使用 PM2
pm2 start npm --name "wagmi-frontend" -- start
```

## Nginx 配置

```nginx
# 前端
server {
    listen 443 ssl http2;
    server_name wagmi.fun www.wagmi.fun;

    ssl_certificate /etc/letsencrypt/live/wagmi.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wagmi.fun/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# API
server {
    listen 443 ssl http2;
    server_name api.wagmi.fun;

    ssl_certificate /etc/letsencrypt/live/api.wagmi.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.wagmi.fun/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Docker 部署

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: wagmi_imo
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  backend:
    build:
      context: ./content-engine
      dockerfile: Dockerfile
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=wagmi_imo
      - GIN_MODE=release
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=https://api.wagmi.fun/api
    ports:
      - "3000:3000"
    restart: always

volumes:
  postgres_data:
```

### Backend Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o wagmi_server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/wagmi_server .
EXPOSE 8080
CMD ["./wagmi_server"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## 安全检查清单

- [ ] 更改默认的 JWT_SECRET
- [ ] 更改默认的 WALLET_ENCRYPTION_KEY
- [ ] 配置 HTTPS
- [ ] 配置防火墙
- [ ] 设置数据库备份
- [ ] 配置日志轮转
- [ ] 启用速率限制
