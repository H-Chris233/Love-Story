# Vue.js爱情记录网站项目总结

## 项目概述

本项目是一个基于Vue.js的全栈爱情记录网站，旨在帮助情侣记录和分享他们的美好时光。项目采用现代化的技术栈，包括Vue 3、TypeScript、Node.js、Express、MongoDB等，实现了完整的前后端分离架构。

## 最近更新

### 集成 Lightning CSS
- 使用 Lightning CSS 替代 PostCSS 和 autoprefixer 作为 CSS 处理器
- 更新了 Vite 配置以支持 Lightning CSS
- 修复了与 Lightning CSS 不兼容的 CSS 语法
- 优化了 CSS 样式以提高构建性能

### 回忆管理功能完善
- 实现了回忆的添加、编辑和删除功能
- 创建了MemoryForm.vue组件用于添加和编辑回忆
- 更新了MemoriesView.vue组件以从后端API获取真实数据
- 增强了MemoryCard.vue组件以支持编辑和删除操作
- 实现了完整的CRUD操作（创建、读取、更新、删除）

## 技术栈

### 前端技术栈
- **Vue 3**: 最新的Vue.js版本，使用Composition API
- **TypeScript**: 全局使用TypeScript进行类型安全开发
- **Vite**: 快速构建工具，提供极速的开发服务器启动
- **Lightning CSS**: 高性能CSS解析器、转换器和优化器
- **Tailwind CSS**: 实用优先的CSS框架，快速构建自定义UI
- **Pinia**: 新一代状态管理库
- **Vue Router**: 单页面应用路由管理
- **Heroicons**: 精美的图标库
- **vue3-carousel**: 轮播组件
- **PhotoSwipe**: 图片浏览库
- **Day.js**: 轻量级日期处理库

### 后端技术栈
- **Node.js**: JavaScript运行时环境
- **Vercel Serverless Functions**: 无服务器函数执行环境
- **TypeScript**: 全局使用TypeScript进行类型安全开发
- **MongoDB**: NoSQL文档数据库
- **MongoDB Native Driver**: 原生数据库驱动（Serverless模式）
- **Mongoose**: MongoDB对象建模工具（传统模式）
- **JWT**: 身份认证令牌
- **EmailJS**: 邮件发送服务
- **Multer**: 文件上传中间件（传统模式）
- **Formidable**: 文件上传解析（Serverless模式）
- **动态路由**: 使用 [endpoint].ts 和 [id].ts 实现灵活的端点映射

### 开发与部署工具
- **PNPM**: 高效的包管理器
- **ESLint**: 代码质量检查工具
- **Prettier**: 代码格式化工具
- **Vite Plugin PWA**: PWA支持插件

## 项目结构

```
love-story-website/
├── src/                    # 前端源码
│   ├── assets/             # 静态资源
│   ├── components/         # Vue组件
│   ├── views/              # 页面视图
│   ├── router/             # 路由配置
│   ├── stores/             # Pinia状态管理
│   ├── types/              # TypeScript类型定义
│   ├── services/           # API服务封装
│   ├── utils/              # 工具函数
│   └── App.vue             # 根组件
├── server/                 # 后端服务
│   ├── controllers/        # 控制器
│   ├── models/             # 数据模型
│   ├── routes/             # 路由
│   ├── middleware/         # 中间件
│   ├── utils/              # 工具函数
│   ├── config/             # 配置文件
│   ├── types/              # TypeScript类型定义
│   └── server.ts           # 服务入口
├── public/                 # 公共资源
└── tests/                  # 测试文件
```

## 核心功能模块

### 1. 用户系统
- 用户注册与登录
- JWT身份验证
- 用户资料管理

### 2. 爱情时间轴
- 创建、编辑、删除记忆
- 时间排序显示
- 详情查看

### 3. 照片相册
- 图片上传与管理
- MongoDB GridFS 存储
- 照片浏览与删除

### 4. 纪念日提醒
- 创建、编辑、删除纪念日（全局共享，不再关联特定用户）
- EmailJS邮件提醒功能（支持私钥认证）
- 每日早上7点自动检查并发送邮件提醒
- 批量邮件发送：一个纪念日会向所有用户发送邮件
- 提前提醒天数设置
- 自动计算剩余天数和日期格式化
- 支持中文日期格式和星期显示
- 测试发送功能：手动触发邮件发送用于测试

## TypeScript实现

### 后端TypeScript特性
- 完整的类型定义覆盖所有模型、控制器、路由
- 接口定义清晰，类型安全
- 使用TypeScript编译器进行代码编译

### 前端TypeScript特性
- Vue组件使用Composition API + TypeScript
- Pinia状态管理使用类型定义
- Vue Router使用类型定义
- API服务封装具有完整的类型支持

## 开发环境配置

### 环境变量配置

#### 前端环境变量 (.env)
```
# 架构模式设置 (true = Serverless 模式，推荐)
VITE_USE_SERVERLESS_FUNCTIONS=true

# Serverless 模式下的 API URL (生产环境)
VITE_SERVERLESS_API_URL=https://your-vercel-project.vercel.app/api

# 开发环境（可选，用于本地开发连接到Vercel函数）
# VITE_SERVERLESS_API_URL=http://localhost:3000/api
```

#### 后端环境变量 (.env) - 传统模式
```
# 服务器端口
PORT=3000

# MongoDB连接
MONGODB_URI=mongodb://localhost:27017/love-story

# JWT密钥
JWT_SECRET=your_jwt_secret_key

# EmailJS配置（纪念日邮件提醒）
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_reminder_template_id
EMAILJS_TODAY_TEMPLATE_ID=your_celebration_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key

# Cron Job认证令牌（可选，用于保护自动提醒端点）
CRON_AUTH_TOKEN=your_secure_cron_auth_token
```

#### Serverless 环境变量 (Vercel Dashboard) - 推荐模式
```
# MongoDB连接
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# JWT密钥
JWT_SECRET=your_secure_jwt_secret_key

# EmailJS配置（纪念日邮件提醒）
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_reminder_template_id
EMAILJS_TODAY_TEMPLATE_ID=your_celebration_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key

# Cron Job认证令牌（可选，用于保护自动提醒端点）
CRON_AUTH_TOKEN=your_secure_cron_auth_token

# 时区设置（用于Cron Jobs）
TZ=Asia/Shanghai
```

## 部署方案

### JAMstack 部署（推荐）

#### Serverless 部署模式 (新推荐)
- **架构**: Vue.js 前端 + Vercel Serverless Functions + MongoDB Atlas
- **前端部署到 Vercel**:
  - 使用Vite构建生产版本
  - 已配置 `vercel.json` 支持 Vue Router 和 Cron Jobs
  - 自动处理静态资源缓存
  - 支持环境变量配置

- **后端部署到 Vercel**:
  - Serverless Functions 部署在 Vercel 平台
  - 无需管理服务器实例
  - 自动扩展，按需付费
  - 集成日志和监控

#### 环境配置
- **开发环境**: 本地 `http://localhost:5173` (前端) + Vercel Functions (后端)
- **生产环境**: Vercel 前后端 + MongoDB Atlas
- **环境变量**: 通过 `VITE_USE_SERVERLESS_FUNCTIONS` 控制架构模式

#### 部署步骤 (Serverless 模式)
1. **Vercel 部署**:
   ```bash
   vercel login
   vercel --prod
   ```

2. **环境变量设置**:
   - Vercel Dashboard: 
     - `VITE_USE_SERVERLESS_FUNCTIONS=true`
     - `MONGODB_URI`, `JWT_SECRET`, `EMAILJS_*` 系列变量
     - `CRON_AUTH_TOKEN` (可选)

#### 传统部署模式 (已弃用)
- **架构**: Vue.js 前端 + Express.js 后端服务器 + MongoDB
- **前端部署到 Vercel**:
  - 使用Vite构建生产版本
  - 已配置 `vercel.json` 支持 Vue Router
  - 自动处理静态资源缓存
  - 支持环境变量配置

- **后端部署到 Railway**:
  - 已配置 `railway.json` 部署文件
  - 支持健康检查端点 `/health`
  - 自动构建和部署
  - 环境变量管理

### 数据库
- MongoDB Atlas云数据库（推荐）
- 支持本地MongoDB开发
- Serverless Functions 使用原生 MongoDB 驱动连接数据库

## 项目特点

1. **现代化技术栈**: 使用最新的Vue 3、TypeScript、Node.js等技术
2. **响应式设计**: 适配各种设备屏幕尺寸
3. **PWA支持**: 可安装为手机应用
4. **类型安全**: 全局使用TypeScript，提供完整的类型检查
5. **简化架构**: 图片存储在 MongoDB 中，无需额外云存储服务
6. **安全性**: JWT认证，Helmet安全头，CORS跨域支持
7. **开发体验**: Vite热重载，ESLint代码检查，Prettier代码格式化

## Lightning CSS 集成

### 简介
Lightning CSS 是一个用 Rust 编写的 CSS 解析器、转换器和优化器。它提供了比传统工具更快的处理速度，并支持现代 CSS 特性。

### 配置
在 `vite.config.ts` 中添加以下配置：

```ts
export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: {
        chrome: 80,
        firefox: 70,
        safari: 13,
        edge: 80
      }
    }
  }
})
```

### 特性支持
1. **自动浏览器前缀**: Lightning CSS 会自动为需要的 CSS 属性添加浏览器前缀，无需额外配置。
2. **CSS 嵌套 (Nesting)**: 支持 CSS 嵌套语法。
3. **CSS 变量优化**: Lightning CSS 会优化 CSS 变量的使用，提高性能。

### 移除冲突的工具
在使用 Lightning CSS 时，应该移除其他 CSS 处理工具以避免冲突：
```bash
pnpm remove postcss autoprefixer
```

## EmailJS 配置详解

### 私钥认证支持
项目已升级支持 EmailJS 私钥认证，提供更好的安全性：

1. **公钥初始化**: 使用 `EMAILJS_PUBLIC_KEY` 初始化 EmailJS 客户端
2. **私钥发送**: 使用 `EMAILJS_PRIVATE_KEY` 进行邮件发送认证
3. **模板参数**: 支持完整的模板参数映射

### 双模板系统
系统现在支持两种不同的邮件模板：

#### 1. 提前提醒模板 (EMAILJS_TEMPLATE_ID)
**触发条件**: `daysLeft > 0` 且 `daysLeft <= reminderDays`
**用途**: 提前提醒即将到来的纪念日
**参数**:
- `anniversary_name`: 纪念日名称
- `days_left`: 距离纪念日的天数
- `anniversary_date_formatted`: 格式化的纪念日日期（中文格式）
- `anniversary_weekday`: 纪念日是星期几
- `current_date`: 当前日期（中文格式）
- `name`: 用户姓名
- `email`: 用户邮箱地址

#### 2. 当天庆祝模板 (EMAILJS_TODAY_TEMPLATE_ID)
**触发条件**: `daysLeft === 0`
**用途**: 当天纪念日的庆祝邮件
**参数**:
- `anniversary_name`: 纪念日名称
- `anniversary_date_formatted`: 格式化的纪念日日期（中文格式）
- `anniversary_weekday`: 纪念日是星期几
- `current_date`: 当前日期（中文格式）
- `name`: 用户姓名
- `email`: 用户邮箱地址
- **注意**: 庆祝模板不包含 `days_left` 参数

### 配置步骤
1. 在 EmailJS 控制台创建服务和模板
2. 获取服务ID、模板ID、公钥和私钥
3. 在服务器环境变量中配置相关参数
4. 模板中使用 `{{parameter_name}}` 格式引用参数

## 自动邮件提醒系统

### 定时任务配置
- **触发时间**: 每天早上 7:00 AM (Asia/Shanghai 时区)
- **使用技术**: node-cron
- **任务文件**: `server/utils/scheduler.ts`

### 自动发送逻辑
1. **每日检查**: 定时任务每天早上7点自动执行
2. **获取数据**: 查询所有纪念日和所有用户
3. **条件匹配**: 检查每个纪念日的 `daysUntil === reminderDays`
4. **批量发送**: 符合条件的纪念日会向所有注册用户发送邮件
5. **错误处理**: 记录发送成功和失败的数量，并输出详细错误信息
6. **速率限制**: 每封邮件之间间隔1秒，避免触发邮件服务商的速率限制

#### 纪念日模型变更
- **移除用户关联**: 纪念日不再属于特定用户
- **全局共享**: 所有用户都能看到和管理所有纪念日
- **统一提醒**: 一个纪念日会向所有用户发送邮件提醒

### 手动测试功能
- **测试API**: `POST /api/anniversaries/remind` (需提供 `testAllReminders=true`)
- **测试范围**: 发送未来7天内的所有纪念日提醒
- **前端按钮**: "测试发送所有邮件提醒" 按钮
- **单个发送**: 每个纪念日卡片上的 📧 按钮可单独测试发送

### Serverless 架构增强
- **新增API端点**: 
  - `POST /api/anniversaries/remind` - 发送单个纪念日提醒给所有用户
  - `POST /api/cron/send-anniversary-reminders` - 自动邮件提醒cron任务
  - `POST /api/images/upload` - 图片上传
  - `DELETE /api/images/[id]` - 删除图片
- **Serverless优化**: 
  - 数据库连接复用
  - 无状态函数设计
  - Vercel Cron Jobs集成
- **架构灵活性**: 支持Serverless和传统两种部署模式

### 邮件发送状态
- **成功统计**: 记录成功发送的邮件数量
- **失败统计**: 记录发送失败的邮件数量
- **错误详情**: 记录具体的错误信息和失败的邮箱地址
- **日志输出**: 所有操作都会在服务器控制台输出详细日志

## 后续优化建议

1. 添加单元测试和端到端测试
2. 实现更丰富的UI组件和动画效果
3. 添加数据备份和恢复功能
4. 实现多语言支持
5. 添加数据分析和统计功能
6. 优化移动端用户体验