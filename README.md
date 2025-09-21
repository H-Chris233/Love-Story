# Love Story Website

记录我们的爱情故事

## 技术栈

### 前端
- Vue 3 + Vite
- Tailwind CSS
- Pinia 状态管理
- Vue Router
- Heroicons 图标库
- vue3-carousel 轮播组件
- PhotoSwipe 图片浏览
- Day.js 日期处理
- EmailJS 邮件通知

### 后端
- Node.js + Express
- MongoDB 数据库 (Mongoose)
- JWT 身份认证
- Cloudinary 媒体存储
- EmailJS 邮件服务

### 部署
- 前端: Vercel
- 后端: Heroku/Railway
- 数据库: MongoDB Atlas

## 项目结构

```
love-story-website/
├── src/                 # 前端源码
│   ├── assets/          # 静态资源
│   ├── components/      # Vue组件
│   ├── views/           # 页面视图
│   ├── router/          # 路由配置
│   ├── stores/          # Pinia状态管理
│   ├── utils/           # 工具函数
│   └── App.vue          # 根组件
├── server/              # 后端服务
│   ├── controllers/     # 控制器
│   ├── models/          # 数据模型
│   ├── routes/          # 路由
│   ├── middleware/      # 中间件
│   ├── utils/           # 工具函数
│   ├── config/          # 配置文件
│   └── server.js        # 服务入口
├── public/              # 公共资源
└── tests/               # 测试文件
```

## 开发环境

### 前端开发
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 后端开发
```bash
# 进入后端目录
cd server

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动生产服务器
pnpm start
```

## 环境变量配置

### 前端环境变量 (.env)
```
VITE_API_BASE_URL=http://localhost:3000/api
```

### 后端环境变量 (.env)
```
# 服务器端口
PORT=3000

# MongoDB连接
MONGODB_URI=mongodb://localhost:27017/love-story

# JWT密钥
JWT_SECRET=your_jwt_secret_key

# Cloudinary配置
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# EmailJS配置
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_USER_ID=your_user_id
```

## 部署

### 前端部署 (Vercel)
1. 连接GitHub仓库到Vercel
2. 配置环境变量
3. 触发自动部署

### 后端部署 (Railway/Heroku)
1. 创建Railway/Heroku账户
2. 连接GitHub仓库
3. 配置环境变量
4. 部署应用

### 数据库 (MongoDB Atlas)
1. 创建MongoDB Atlas账户
2. 创建集群和数据库
3. 配置网络访问
4. 获取连接字符串

## 功能模块

### 用户系统
- [x] 用户注册
- [x] 用户登录
- [x] 身份验证
- [x] 用户资料

### 记忆时光轴
- [x] 创建记忆
- [x] 编辑记忆
- [x] 删除记忆
- [x] 查看记忆详情
- [x] 时间排序

### 照片相册
- [x] 上传照片
- [x] 照片管理
- [x] 照片浏览
- [x] 照片删除

### 纪念日提醒
- [x] 创建纪念日
- [x] 编辑纪念日
- [x] 删除纪念日
- [x] 邮件提醒

## 注意事项

1. 确保MongoDB服务正在运行
2. 配置正确的环境变量
3. Cloudinary和EmailJS需要注册账户并获取API密钥
4. 前后端需要分别启动才能正常工作