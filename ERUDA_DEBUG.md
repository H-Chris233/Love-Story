# Eruda 调试工具集成说明

## 简介
Eruda 是一个专为移动端网页设计的调试面板，功能类似于浏览器的开发者工具，但专门用于移动端环境。

## 如何启用

### 1. 开发环境
在开发模式下 (使用 `npm run dev`)，Eruda 会自动启用。

### 2. 生产环境
在生产环境中，可以通过以下方式启用 Eruda：
- 在 URL 后添加 `?debug=true` 参数，例如：`https://your-domain.com/?debug=true`
- 或者使用 `?debug=1`

## 使用方法

1. 启用 Eruda 后，页面右下角会出现一个调试按钮
2. 点击按钮可打开调试面板
3. 在调试面板中可以访问以下功能：
   - Console (控制台)
   - Elements (元素检查器)
   - Network (网络请求监控)
   - Resources (资源管理)
   - Info (设备信息)
   - Storage (存储管理)
   - Source (源代码查看)
   - Settings (设置)

## 可用功能

- **Console**: 查看控制台日志、错误信息，支持执行 JavaScript 代码
- **Elements**: 检查和编辑 DOM 元素
- **Network**: 监控网络请求，查看请求详情
- **Resources**: 查看和管理 localStorage、sessionStorage、cookie 等
- **Info**: 显示设备信息和用户代理
- **Storage**: 管理各种存储
- **Source**: 查看页面源代码
- **Settings**: 调试面板设置

## 配置说明

当前 Eruda 配置：
- 默认显示所有调试工具
- 使用 Monokai 主题
- 透明度设置为 0.9
- 自动缩放以适应不同屏幕

## 注意事项

1. Eruda 仅在开发环境或 URL 包含 ?debug 参数时启用
2. 在生产环境中使用 Eruda 可能会暴露敏感信息，请谨慎使用
3. Eruda 会占用一定的性能资源，在正式测试性能时建议关闭
4. 在移动设备上，可以在浏览器中访问网站并启用 Eruda 进行调试

## 开发调试

在开发过程中，您还可以在代码中使用 Eruda 进行动态调试：

```javascript
// 在需要调试的地方添加代码
if (window.eruda) {
  window.eruda.console.log('Debug info:', someVariable);
}
```

## 移除调试工具

如果需要在某个环境中完全禁用 Eruda，可以：

1. 从 `src/main.ts` 中移除 Eruda 相关代码
2. 从 package.json 中移除 eruda 依赖
3. 运行 `npm install` 或 `pnpm install` 更新依赖