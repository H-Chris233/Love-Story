# 开发环境设置指南

本文档说明如何正确设置开发环境，以确保日志正常输出并正确使用无服务器函数。

## 运行模式

### 1. 使用 Vercel 无服务器函数 (推荐)

这种方式将同时运行前端 Vite 开发服务器和 Vercel 无服务器函数。

1. **安装 Vercel CLI**:
```bash
npm install -g vercel
# 或者
yarn global add vercel
```

2. **设置环境变量**:
创建 `.env` 文件并确保以下设置:
```
VITE_USE_SERVERLESS_FUNCTIONS=true
VITE_SERVERLESS_API_URL=http://localhost:3000/api
VITE_LOG_LEVEL=debug
```

3. **运行开发服务器**:
```bash
# 在项目根目录运行
vercel dev
```

在这种模式下:
- 前端运行在 http://localhost:3000
- API 函数也运行在 http://localhost:3000/api
- 所有日志都会输出到终端

### 2. 使用传统 Express 服务器

1. **设置环境变量**:
```
VITE_USE_SERVERLESS_FUNCTIONS=false
VITE_API_BASE_URL=http://localhost:3000/api
```

2. **运行后端服务器**:
```bash
cd server
npm run dev
```

3. **运行前端**:
```bash
# 在项目根目录
npm run dev
```

## 日志配置

### 前端日志
- 在开发模式下 (`import.meta.env.DEV` 为 true)，所有级别的日志都会显示
- 在生产模式下，只有 `VITE_LOG_LEVEL` 及以上级别的日志才会显示
- 可通过 `VITE_LOG_LEVEL` 环境变量控制生产模式下的日志级别

### 后端日志
- 可通过 `LOG_LEVEL` 环境变量控制日志级别 (ERROR, WARN, INFO, DEBUG)
- 默认为 INFO 级别

## 调试工具 - Eruda

项目已集成 Eruda 调试工具，这是一个用于移动端网页的调试面板，功能类似于浏览器开发者工具。

### 启用方法
- **开发环境**: 在开发模式下自动启用
- **生产环境**: 在 URL 后添加 `?debug=true` 参数，例如：`http://localhost:5173/?debug=true`

### 功能
- Console (控制台)
- Elements (元素检查器)
- Network (网络请求监控)
- Resources (资源管理)
- Info (设备信息)
- Storage (存储管理)
- Source (源代码查看)
- Settings (设置)

## 验证配置

启动应用后，你应该在终端中看到类似以下的日志输出：

```
🔧 [LOGGER] Log level set to: INFO (serverless)
🔧 [LOGGER] Environment: development
✅ [API] Using serverless functions with URL: http://localhost:3000/api
🌐 [API] Current mode - Serverless: true
```

如启用了 Eruda，您还会看到：
```
🔧 [ERUDA] Eruda debugging panel initialized
ℹ️ [ERUDA] Current mode: development
```

## 故障排除

如果日志没有正常输出：

1. 检查环境变量是否正确设置
2. 确认 `VITE_LOG_LEVEL` 在开发环境中设置为 `debug` 或 `info`
3. 检查 API 路径是否正确配置
4. 验证后端服务器是否正在运行
5. 检查页面是否正确加载了 Eruda 调试面板（在页面右下角寻找调试按钮）