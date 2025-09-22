# Lightning CSS 集成指南

## 简介

Lightning CSS 是一个用 Rust 编写的 CSS 解析器、转换器和优化器。它提供了比传统工具更快的处理速度，并支持现代 CSS 特性。

## 安装

```bash
pnpm add -D lightningcss
```

## 配置

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

## 特性支持

### 1. 自动浏览器前缀
Lightning CSS 会自动为需要的 CSS 属性添加浏览器前缀，无需额外配置。

### 2. CSS 嵌套 (Nesting)
支持 CSS 嵌套语法：

```css
.card {
  background: white;
  
  & .title {
    font-size: 1.5rem;
    
    &:hover {
      color: blue;
    }
  }
}
```

### 3. 自定义媒体查询
支持自定义媒体查询：

```css
@custom-media --tablet (width >= 768px);

@media (--tablet) {
  .container {
    padding: 2rem;
  }
}
```

### 4. CSS 变量优化
Lightning CSS 会优化 CSS 变量的使用，提高性能。

## 移除冲突的工具

在使用 Lightning CSS 时，应该移除其他 CSS 处理工具以避免冲突：

```bash
pnpm remove postcss autoprefixer
```

## 使用示例

请查看 `/src/components/LightningCSSTest.vue` 和 `/src/assets/test-lightning.css` 文件了解具体的使用示例。

## 测试

可以通过访问 `/lightning-css-test` 路由来测试 Lightning CSS 的功能。

## 性能优势

Lightning CSS 相比传统工具具有显著的性能优势：
- 更快的构建速度
- 更小的打包体积
- 更好的 CSS 优化