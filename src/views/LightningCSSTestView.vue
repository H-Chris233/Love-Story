<template>
  <div class="romantic-demo-page">
    <div class="romantic-container">
      <h1 class="romantic-title romantic-fade-in">Lightning CSS 功能测试</h1>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">CSS 嵌套 (Nesting)</h2>
        <div class="romantic-card">
          <div class="romantic-card-body">
            <div class="nested-test">
              <div class="nested-item">嵌套样式测试</div>
              <ul class="nested-list">
                <li>列表项 1</li>
                <li>列表项 2</li>
                <li>列表项 3</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">CSS 自定义媒体查询</h2>
        <div class="romantic-card">
          <div class="romantic-card-body">
            <div class="media-test">
              <p class="media-text">调整浏览器窗口大小查看响应式效果</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">CSS 逻辑属性</h2>
        <div class="romantic-card">
          <div class="romantic-card-body">
            <div class="logical-properties-test">
              <p>这段文字使用了逻辑属性进行布局</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="romantic-demo-section">
        <h2 class="romantic-card-title">CSS 颜色函数</h2>
        <div class="romantic-grid romantic-grid-cols-2 md:romantic-grid-cols-4 romantic-gap-4">
          <div class="color-test color-test-1">
            <p>颜色混合</p>
          </div>
          <div class="color-test color-test-2">
            <p>颜色调整</p>
          </div>
          <div class="color-test color-test-3">
            <p>透明度</p>
          </div>
          <div class="color-test color-test-4">
            <p>色调旋转</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这是一个测试 Lightning CSS 功能的页面
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

/* 测试 CSS 嵌套 (Nesting) */
.nested-test {
  background: var(--romantic-light);
  padding: var(--romantic-spacing-4);
  border-radius: var(--romantic-radius);
  
  & .nested-item {
    color: var(--romantic-primary);
    font-weight: var(--romantic-font-weight-medium);
    padding: var(--romantic-spacing-2);
    border-radius: var(--romantic-radius-sm);
    background: var(--romantic-white);
    margin-bottom: var(--romantic-spacing-2);
    
    &:hover {
      color: var(--romantic-primary-dark);
      text-decoration: underline;
    }
  }
  
  & .nested-list {
    margin-top: var(--romantic-spacing-2);
    padding-left: var(--romantic-spacing-4);
    
    & li {
      margin-bottom: var(--romantic-spacing-1);
      color: var(--romantic-dark-medium);
      
      &:last-child {
        margin-bottom: 0;
      }
      
      &:hover {
        color: var(--romantic-primary);
      }
    }
  }
}

/* 测试媒体查询 */
.media-test {
  padding: var(--romantic-spacing-4);
  background: var(--romantic-white);
  border-radius: var(--romantic-radius);
  text-align: center;
  
  & .media-text {
    color: var(--romantic-dark);
    font-size: var(--romantic-font-size-base);
  }
  
  /* 小屏幕 */
  @media (width < 480px) {
    & .media-text {
      font-size: var(--romantic-font-size-sm);
      color: var(--romantic-primary);
    }
  }
  
  /* 中等屏幕 */
  @media (width >= 480px) and (width < 768px) {
    & .media-text {
      font-size: var(--romantic-font-size-lg);
      color: var(--romantic-secondary);
    }
  }
  
  /* 大屏幕 */
  @media (width >= 768px) {
    & .media-text {
      font-size: var(--romantic-font-size-xl);
      color: var(--romantic-accent);
    }
  }
}

/* 测试逻辑属性 */
.logical-properties-test {
  padding: var(--romantic-spacing-4);
  background: var(--romantic-white);
  border-radius: var(--romantic-radius);
  
  & p {
    margin-block: var(--romantic-spacing-2);
    padding-inline: var(--romantic-spacing-3);
    border-inline-start: 3px solid var(--romantic-primary);
    color: var(--romantic-dark);
  }
}

/* 测试颜色函数 */
.color-test {
  padding: var(--romantic-spacing-4);
  border-radius: var(--romantic-radius);
  text-align: center;
  color: var(--romantic-white);
  font-weight: var(--romantic-font-weight-medium);
}

.color-test-1 {
  background: var(--romantic-primary);
}

.color-test-2 {
  background: var(--romantic-secondary);
}

.color-test-3 {
  background: var(--romantic-accent);
}

.color-test-4 {
  background: var(--romantic-danger);
}

@media (max-width: 768px) {
  .romantic-demo-page {
    padding: var(--romantic-spacing-4) 0;
  }
}
</style>