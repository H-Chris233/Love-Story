# Love Story Website

记录我们的爱情故事

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
- **Express**: 轻量级后端API框架
- **TypeScript**: 全局使用TypeScript进行类型安全开发
- **MongoDB**: NoSQL文档数据库
- **Mongoose**: MongoDB对象建模工具
- **JWT**: 身份认证令牌
- **EmailJS**: 邮件发送服务
- **Multer**: 文件上传中间件

### 开发与部署工具
- **PNPM**: 高效的包管理器
- **ESLint**: 代码质量检查工具
- **Prettier**: 代码格式化工具
- **Vite Plugin PWA**: PWA支持插件

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

# EmailJS配置
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_USER_ID=your_user_id
```

## 浪漫主题样式

本项目包含一个完整的浪漫主题样式系统，使用传统的CSS实现，为爱情故事网站提供温馨浪漫的视觉体验。

### 主要特性

1. **全局CSS变量** - 定义了浪漫主题的颜色、间距、字体等变量
2. **组件样式** - 提供了按钮、表单、卡片等组件的浪漫样式
3. **动画效果** - 包含心跳、浮动、脉动等浪漫动画
4. **响应式设计** - 针对移动端进行了优化

### 使用方法

在Vue组件中可以直接使用浪漫主题的CSS类：

```html
<!-- 浪漫按钮 -->
<button class="romantic-button">主要按钮</button>
<button class="romantic-button romantic-button-secondary">次要按钮</button>

<!-- 浪漫卡片 -->
<div class="romantic-card">
  <div class="romantic-card-header">
    <h3 class="romantic-card-title">浪漫卡片</h3>
  </div>
  <div class="romantic-card-body">
    <p>这是一个浪漫主题的卡片组件</p>
  </div>
</div>

<!-- 浪漫表单 -->
<div class="romantic-form">
  <div class="romantic-form-group">
    <label class="romantic-form-label">姓名</label>
    <input type="text" class="romantic-form-input" placeholder="请输入您的姓名">
  </div>
</div>
```

### 样式演示

访问 `/demo` 路径可以查看浪漫主题样式的完整演示。

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

### 3. 照片相册
- 图片上传与管理
- MongoDB GridFS 存储
- 照片浏览与删除

### 纪念日提醒
- [x] 创建纪念日
- [x] 编辑纪念日
- [x] 删除纪念日
- [x] 邮件提醒

## 重构说明

### Tailwind CSS优先策略
为了提高开发效率和保持样式一致性，我们对项目进行了全面重构，优先使用Tailwind CSS工具类替代传统CSS：

1. **Navigation组件** - 重构为完全使用Tailwind工具类，移除了所有传统CSS
2. **App根组件** - 简化了全局样式，移除了不必要的自定义CSS
3. **HomeView主页** - 使用Tailwind重新实现了布局和样式
4. **MemoriesView回忆页面** - 使用Tailwind重构了时间轴布局
5. **AnniversariesView纪念日页面** - 使用Tailwind重构了卡片布局
6. **PhotosView照片相册** - 使用Tailwind重构了网格布局
7. **LoveTimer组件** - 使用Tailwind重构了计时器样式

### Tailwind配置优化
扩展了Tailwind配置文件，添加了项目中常用的自定义颜色、间距、字体大小等，以更好地匹配设计需求。

## 注意事项

1. 确保MongoDB服务正在运行
2. 配置正确的环境变量
3. Cloudinary和EmailJS需要注册账户并获取API密钥
4. 前后端需要分别启动才能正常工作