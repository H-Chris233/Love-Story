<template>
  <div class="romantic-demo-page">
    <div class="romantic-container">
      <h1 class="romantic-title romantic-fade-in">浪漫主题样式展示</h1>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">按钮样式</h2>
        <div class="romantic-demo-buttons romantic-flex romantic-flex-wrap romantic-gap-4 romantic-mt-4">
          <button class="romantic-button">主要按钮</button>
          <button class="romantic-button romantic-button-secondary">次要按钮</button>
          <button class="romantic-button romantic-button-accent">强调按钮</button>
          <button class="romantic-button romantic-button-outline">轮廓按钮</button>
          <button class="romantic-button romantic-button-sm">小按钮</button>
          <button class="romantic-button romantic-button-lg">大按钮</button>
          <button class="romantic-button romantic-button-xl">超大按钮</button>
        </div>
      </div>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">卡片样式</h2>
        <div class="romantic-card romantic-fade-in">
          <div class="romantic-card-header">
            <h3 class="romantic-card-title">浪漫卡片</h3>
            <p class="romantic-card-subtitle">这是一个副标题</p>
          </div>
          <div class="romantic-card-body">
            <p class="romantic-text">这是一个浪漫主题的卡片组件，具有柔和的颜色和优雅的阴影效果。</p>
          </div>
          <div class="romantic-card-footer">
            <button class="romantic-button romantic-button-sm">操作按钮</button>
          </div>
        </div>
      </div>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">表单样式</h2>
        <div class="romantic-form romantic-fade-in">
          <div class="romantic-form-group">
            <label class="romantic-form-label">姓名</label>
            <input type="text" class="romantic-form-input" placeholder="请输入您的姓名">
          </div>
          <div class="romantic-form-group">
            <label class="romantic-form-label">邮箱</label>
            <input type="email" class="romantic-form-input" placeholder="请输入您的邮箱">
          </div>
          <div class="romantic-form-group">
            <label class="romantic-form-label">选择</label>
            <select class="romantic-form-select">
              <option value="">请选择</option>
              <option value="option1">选项 1</option>
              <option value="option2">选项 2</option>
              <option value="option3">选项 3</option>
            </select>
          </div>
          <div class="romantic-form-group">
            <label class="romantic-form-label">留言</label>
            <textarea class="romantic-form-textarea" placeholder="请输入您的留言"></textarea>
          </div>
          <div class="romantic-form-group">
            <button class="romantic-button">提交</button>
          </div>
        </div>
      </div>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">徽章和分隔线</h2>
        <div class="romantic-flex romantic-flex-wrap romantic-gap-2 romantic-my-4">
          <span class="romantic-badge">默认</span>
          <span class="romantic-badge romantic-badge-secondary">次要</span>
          <span class="romantic-badge romantic-badge-accent">强调</span>
          <span class="romantic-badge romantic-badge-success">成功</span>
          <span class="romantic-badge romantic-badge-warning">警告</span>
          <span class="romantic-badge romantic-badge-danger">危险</span>
        </div>
        <div class="romantic-divider"></div>
        <div class="romantic-divider romantic-divider-dashed"></div>
      </div>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">动画效果</h2>
        <div class="romantic-demo-animations romantic-flex romantic-justify-center romantic-items-center romantic-flex-wrap romantic-gap-6 romantic-mt-4">
          <div class="romantic-heartbeat" style="font-size: 2rem;">❤️</div>
          <div class="romantic-float" style="font-size: 2rem;">🎈</div>
          <div class="romantic-pulse" style="font-size: 2rem;">✨</div>
          <div class="romantic-fade-in" style="font-size: 2rem;">fadeIn</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这是一个演示浪漫主题样式的页面
</script>

<style scoped>
.romantic-demo-page {
  padding: var(--romantic-spacing-8) 0;
  min-height: calc(100vh - 70px);
  background: var(--romantic-gradient);
}

.romantic-demo-section {
  margin-bottom: var(--romantic-spacing-8);
}

.romantic-demo-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--romantic-spacing-4);
  margin-top: var(--romantic-spacing-4);
}

.romantic-demo-animations {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  margin-top: var(--romantic-spacing-4);
}

@media (max-width: 768px) {
  .romantic-demo-page {
    padding: var(--romantic-spacing-4) 0;
  }
  
  .romantic-demo-buttons {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .romantic-demo-animations {
    flex-direction: column;
    gap: var(--romantic-spacing-4);
  }
}
</style>