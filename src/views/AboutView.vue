<script setup lang="ts">
import { ref } from 'vue'

// 跟踪当前激活的功能项索引（-1表示没有激活项）
const activeFeatureIndex = ref<number>(-1)

// 处理功能项点击
const toggleFeature = (index: number) => {
  // 如果点击的是当前激活项，则取消激活
  if (activeFeatureIndex.value === index) {
    activeFeatureIndex.value = -1
  } else {
    // 否则激活当前项（自动取消其他项）
    activeFeatureIndex.value = index
  }
}

// 检查功能项是否被点击
const isFeatureClicked = (index: number) => {
  return activeFeatureIndex.value === index
}
</script>

<template>
  <div class="romantic-home romantic-fade-in">
    <div class="container">
      <header class="page-header">
        <h1 class="text-3xl font-bold text-center mb-8">关于我们</h1>
        <p class="text-center text-gray-600 mb-10 intro-text">记录我们的爱情故事，珍藏美好回忆</p>
      </header>

      <div class="content-section">
        <div class="about-card">
          <h2 class="section-title">网站介绍</h2>
          <p class="section-content">
            这是一个专为我们设计的爱情故事网站，用来记录我们在一起的每一个美好瞬间。
            从初次相遇的那天起，到每一个重要的纪念日，所有的回忆都将在这里珍藏。
          </p>
        </div>

        <div class="about-card">
          <h2 class="section-title">功能特色</h2>
          <ul class="features-list">
            <li 
              class="feature-item"
              :class="{ 'clicked': isFeatureClicked(0) }"
              @click="toggleFeature(0)"
            >
              <span class="feature-icon">📅</span>
              <span><strong class="feature-title">回忆时光轴：</strong><span class="feature-description">按时间顺序记录我们的爱情历程</span></span>
            </li>
            <li 
              class="feature-item"
              :class="{ 'clicked': isFeatureClicked(1) }"
              @click="toggleFeature(1)"
            >
              <span class="feature-icon">📸</span>
              <span><strong class="feature-title">照片相册：</strong><span class="feature-description">珍藏我们的每一张合影</span></span>
            </li>
            <li 
              class="feature-item"
              :class="{ 'clicked': isFeatureClicked(2) }"
              @click="toggleFeature(2)"
            >
              <span class="feature-icon feature-icon-highlighted">🎉</span>
              <span><strong class="feature-title">纪念日提醒：</strong><span class="feature-description">重要日子提醒，不再错过</span></span>
            </li>
            <li 
              class="feature-item"
              :class="{ 'clicked': isFeatureClicked(3) }"
              @click="toggleFeature(3)"
            >
              <span class="feature-icon">🔒</span>
              <span><strong class="feature-title">隐私保护：</strong><span class="feature-description">只有我们两个人可以访问</span></span>
            </li>
          </ul>
        </div>

        <div class="about-card">
          <h2 class="section-title">技术栈</h2>
          <div class="tech-stack">
            <div class="tech-category">
              <h3>前端技术</h3>
              <ul>
                <li>Vue 3 + TypeScript</li>
                <li>Tailwind CSS</li>
                <li>Vue Router</li>
                <li>Pinia 状态管理</li>
              </ul>
            </div>
            <div class="tech-category">
              <h3>后端技术</h3>
              <ul>
                <li>Node.js + Express</li>
                <li>MongoDB 数据库</li>
                <li>JWT 身份认证</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.romantic-home {
  min-height: calc(100vh - 70px);
  background: var(--romantic-gradient);
  padding: var(--romantic-spacing-6);
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: var(--romantic-font-size-4xl);
  font-weight: var(--romantic-font-weight-bold);
  color: var(--romantic-dark);
  margin-bottom: var(--romantic-spacing-4);
}

.page-header p {
  font-size: var(--romantic-font-size-xl);
  font-weight: var(--romantic-font-weight-normal);
  color: var(--romantic-dark-medium);
  margin-bottom: var(--romantic-spacing-8);
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.about-card {
  background: var(--romantic-white);
  border-radius: var(--romantic-radius);
  box-shadow: var(--romantic-shadow);
  padding: var(--romantic-spacing-6);
  transition: var(--romantic-transition);
  border: 1px solid rgba(255, 107, 157, 0.1);
}

.about-card:hover {
  transform: translateY(-3px);
}

.section-title {
  font-size: var(--romantic-font-size-2xl);
  font-weight: var(--romantic-font-weight-bold);
  color: var(--romantic-dark);
  margin-bottom: var(--romantic-spacing-4);
  border-bottom: 1px solid var(--romantic-gray);
  padding-bottom: var(--romantic-spacing-2);
}

.section-content {
  color: var(--romantic-dark);
  line-height: var(--romantic-line-height-relaxed);
  font-size: var(--romantic-font-size-base);
}

.features-list {
  list-style: none;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: var(--romantic-spacing-4);
  margin-bottom: var(--romantic-spacing-4);
  padding: var(--romantic-spacing-4);
  border-radius: var(--romantic-radius);
  background: var(--romantic-light);
  transition: var(--romantic-transition);
  cursor: pointer;
}

.feature-item:hover {
  background: #f1f5f9; /* slate-100 */
}

.feature-item.clicked {
  background: linear-gradient(135deg, #fff5f8 0%, #ffffff 100%) !important;
  border: 1px solid var(--romantic-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.2);
}

.feature-item.clicked .feature-title {
  color: var(--romantic-primary-dark) !important;
}

.feature-item.clicked .feature-description {
  color: var(--romantic-white) !important;
}

.feature-item.clicked .feature-icon {
  color: var(--romantic-primary) !important;
  transform: scale(1.1);
}

.feature-icon {
  font-size: var(--romantic-font-size-xl);
  color: var(--romantic-primary);
}

.intro-text {
  color: var(--romantic-primary-dark) !important;
}

.feature-title {
  color: var(--romantic-primary-dark);
}

.feature-description {
  color: var(--romantic-dark);
}

.feature-icon-highlighted {
  color: var(--romantic-primary-dark);
}

.tech-stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.tech-category h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--romantic-dark);
}

.tech-category ul {
  list-style: none;
}

.tech-category li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e2e8f0; /* slate-200 */
  color: var(--romantic-dark-medium);
}

.tech-category li:last-child {
  border-bottom: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .romantic-home {
    padding: var(--romantic-spacing-4);
  }
  
  .about-card {
    padding: var(--romantic-spacing-4);
  }
  
  .section-content {
    font-size: var(--romantic-font-size-sm);
  }
  
  .tech-stack {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    margin-bottom: var(--romantic-spacing-4);
  }
  
  .page-header h1 {
    font-size: var(--romantic-font-size-3xl);
  }
  
  .page-header p {
    font-size: var(--romantic-font-size-lg);
  }
  
  .content-section {
    gap: var(--romantic-spacing-6);
  }
  
  .section-title {
    font-size: var(--romantic-font-size-xl);
  }
  
  .feature-item {
    padding: var(--romantic-spacing-3);
    gap: var(--romantic-spacing-3);
  }
  
  .feature-icon {
    font-size: var(--romantic-font-size-lg);
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .romantic-home {
    padding: var(--romantic-spacing-3);
  }
  
  .container {
    padding: 0;
  }
  
  .about-card {
    padding: var(--romantic-spacing-3);
    border-radius: var(--romantic-radius-sm);
  }
  
  .page-header h1 {
    font-size: var(--romantic-font-size-2xl);
  }
  
  .page-header p {
    font-size: var(--romantic-font-size-base);
  }
  
  .content-section {
    gap: var(--romantic-spacing-4);
  }
  
  .section-title {
    font-size: var(--romantic-font-size-lg);
    margin-bottom: var(--romantic-spacing-3);
  }
  
  .section-content {
    font-size: var(--romantic-font-size-sm);
    line-height: var(--romantic-line-height-normal);
  }
  
  .feature-item {
    padding: var(--romantic-spacing-2);
    gap: var(--romantic-spacing-2);
    margin-bottom: var(--romantic-spacing-3);
  }
  
  .feature-icon {
    font-size: var(--romantic-font-size-base);
  }
  
  .tech-category h3 {
    font-size: var(--romantic-font-size-base);
    margin-bottom: var(--romantic-spacing-3);
  }
  
  .tech-category li {
    padding: var(--romantic-spacing-1) 0;
    font-size: var(--romantic-font-size-sm);
  }
}
</style>
