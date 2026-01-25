# WAGMI Content Engine

内容引擎后端服务，用于管理和加工 WAGMI 平台的内容。

## 技术栈

- Go 1.21+
- Gin (Web 框架)
- GORM (ORM)
- PostgreSQL (数据库)
- POE API (AI 服务)

## 快速开始

### 1. 安装依赖

```bash
go mod download
```

### 2. 配置数据库

确保 PostgreSQL 运行中，创建数据库：

```sql
CREATE DATABASE content_engine;
```

或使用 Docker：

```bash
docker run --name wagmi-postgres -e POSTGRES_PASSWORD=wagmi123 -e POSTGRES_DB=content_engine -p 5432:5432 -d postgres:15
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，修改配置：

```bash
cp .env.example .env
```

### 4. 启动服务

```bash
go run cmd/server/main.go
```

服务将在 http://localhost:8080 启动。

## API 接口

### 内容管理

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/contents | 获取内容列表 |
| GET | /api/contents/:id | 获取单条内容 |
| POST | /api/contents | 创建内容 |
| PUT | /api/contents/:id | 更新内容 |
| DELETE | /api/contents/:id | 删除内容 |
| POST | /api/contents/:id/approve | 审核通过 |
| POST | /api/contents/:id/reject | 审核拒绝 |
| POST | /api/contents/:id/publish | 发布内容 |

### AI 加工

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | /api/process/:id | AI 加工单条内容 |
| POST | /api/process/batch | 批量 AI 加工 |

### 标签管理

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/tags | 获取所有标签 |
| POST | /api/tags | 创建标签 |
| DELETE | /api/tags/:id | 删除标签 |

### 系统配置

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/settings | 获取所有配置 |
| PUT | /api/settings/:key | 更新配置 |

### 统计与公开 API

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/stats | 获取统计数据 |
| GET | /api/public/contents | 公开 API - 获取已发布内容 |

## 项目结构

```
content-engine/
├── cmd/
│   └── server/
│       └── main.go              # 入口文件
├── internal/
│   ├── config/
│   │   └── config.go            # 配置管理
│   ├── models/
│   │   ├── models.go            # 数据模型
│   │   └── json_types.go        # JSON 类型处理
│   ├── handlers/
│   │   ├── content_handler.go   # 内容 API
│   │   ├── process_handler.go   # AI 加工 API
│   │   ├── tag_handler.go       # 标签 API
│   │   └── setting_handler.go   # 配置 API
│   ├── services/
│   │   ├── content_service.go   # 内容业务逻辑
│   │   └── ai_service.go        # AI 服务
│   └── repository/
│       ├── content_repository.go
│       ├── tag_repository.go
│       └── setting_repository.go
├── .env.example
├── .env
├── go.mod
└── README.md
```

## 内容状态流转

```
raw → processing → pending → approved → published
                      ↓
                   rejected
```

- `raw`: 原始导入
- `processing`: AI 加工中
- `pending`: 待审核
- `approved`: 已通过
- `published`: 已发布
- `rejected`: 已拒绝
