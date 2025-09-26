# 架构模式切换说明

本项目支持两种部署架构模式，可以通过环境变量进行切换：

## 部署模式

### 1. 传统服务器模式 (默认)
- **环境变量**: `VITE_USE_SERVERLESS_FUNCTIONS=false` 或不设置
- **架构**: Vue.js 前端 + Express.js 后端服务器 + MongoDB
- **部署**: 
  - 前端部署到 Vercel
  - 后端部署到 Railway 或其他支持 Node.js 应用的平台

### 2. Serverless 模式
- **环境变量**: `VITE_USE_SERVERLESS_FUNCTIONS=true`
- **架构**: Vue.js 前端 + Vercel Serverless Functions + MongoDB Atlas
- **部署**: 
  - 前端和后端 API 都部署到 Vercel
  - 使用 Vercel 的 Serverless Functions 处理后端逻辑
  - 数据库使用 MongoDB Atlas 或其他云数据库

## 环境变量配置

### 前端环境变量 (.env)
```
# Serverless 模式开关
VITE_USE_SERVERLESS_FUNCTIONS=true  # 使用 Serverless Functions
# VITE_USE_SERVERLESS_FUNCTIONS=false  # 使用传统服务器 (默认)

# API 基础 URL
VITE_API_BASE_URL=http://localhost:3000/api  # 传统服务器模式 (开发)
VITE_SERVERLESS_API_URL=/api  # Serverless 模式 (Vercel)

# 生产环境
VITE_API_BASE_URL=https://your-app.railway.app/api  # 传统服务器模式
# 或
VITE_SERVERLESS_API_URL=https://your-app.vercel.app/api  # Serverless 模式
```

### 后端环境变量 (如果使用传统模式)
```
# 服务器端口
PORT=3000

# MongoDB连接
MONGODB_URI=mongodb://localhost:27017/love-story
# 或 MongoDB Atlas 连接字符串
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/love-story

# JWT密钥
JWT_SECRET=your_jwt_secret_key

# EmailJS配置
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_reminder_template_id
EMAILJS_TODAY_TEMPLATE_ID=your_celebration_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
```

## 功能兼容性

### 完全兼容的功能
- 用户注册与登录
- 记忆（Memories）管理
- 纪念日（Anniversaries）管理
- 用户资料管理

### 需要特殊配置的功能
- **定时任务**：在 Serverless 模式下使用 Vercel Cron Jobs 替代 node-cron
  - 路径: `/api/cron/anniversary-reminders`
  - 调度: `0 7 * * *` (每天早上 7 点)

## 部署说明

### 传统模式部署
1. 前端部署到 Vercel
2. 后端部署到 Railway
3. 配置环境变量，不设置 `VITE_USE_SERVERLESS_FUNCTIONS` 或设置为 `false`

### Serverless 模式部署
1. 整个应用部署到 Vercel
2. 配置环境变量设置 `VITE_USE_SERVERLESS_FUNCTIONS=true`
3. 在 `vercel.json` 中配置 Cron Jobs

## 项目结构

Serverless 函数存放在 `api/` 目录下：
```
api/
├── anniversaries/
│   ├── [id].ts         # 获取、更新、删除特定纪念日
│   ├── create.ts       # 创建纪念日
│   ├── index.ts        # 获取所有纪念日
│   ├── remind.ts       # 发送纪念日提醒
│   └── test-reminders.ts # 测试发送所有纪念日提醒
├── auth/
│   └── [endpoint].ts   # 综合认证端点（注册、登录、资料、用户管理等）
├── cron/
│   └── send-anniversary-reminders.ts # 定时任务：纪念日提醒
├── images/
│   ├── [id].ts         # 获取、删除特定图片
│   ├── index.ts        # 获取所有图片
│   └── upload.ts       # 上传图片
├── memories/
│   ├── [id].ts         # 获取、更新、删除特定记忆
│   └── index.ts        # 获取所有记忆
├── utils/
│   └── imageUpload.ts  # 图片上传工具
├── health.ts           # 健康检查
└── vercel.json         # Vercel配置文件
```

## API 端点映射

### 动态路由端点

#### 认证端点 (api/auth/[endpoint].ts)
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户资料
- `GET /api/auth/users` - 获取所有用户（管理员）
- `DELETE /api/auth/users/:userId` - 删除用户（管理员）
- `GET /api/auth/check-registration` - 检查注册是否允许

## 功能兼容性

### 完全兼容的功能
- 用户注册与登录
- 记忆（Memories）管理
- 纪念日（Anniversaries）管理
- 用户资料管理
- 图片上传和管理
- 纪念日邮件提醒
- 自动邮件提醒调度
- 手动提醒测试

### 需要特殊配置的功能
- **定时任务**：在 Serverless 模式下使用 Vercel Cron Jobs 替代 node-cron
  - 路径: `/api/cron/send-anniversary-reminders`
  - 调度: `0 7 * * *` (每天早上 7 点)
  - 需要设置环境变量 `CRON_AUTH_TOKEN` 来保护端点

## 数据库适配

Serverless 函数使用 MongoDB，通过 `lib/db.ts` 进行连接管理，该模块已适配 Serverless 环境，使用连接池管理和热重启处理。