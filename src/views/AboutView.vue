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

// 检查功能项是否被激活
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
          <div class="features-grid">
            <div 
              class="feature-card"
              :class="{ 'active': isFeatureClicked(0) }"
              @click="toggleFeature(0)"
            >
              <div class="feature-header">
                <span class="feature-icon">💕</span>
                <h3 class="feature-title">爱情时光轴</h3>
              </div>
              <p class="feature-description">
                记录我们从相遇到相知相爱的每一个重要时刻，用时间线的方式展现我们的爱情故事，让美好回忆永远保存。
              </p>

            </div>

            <div 
              class="feature-card"
              :class="{ 'active': isFeatureClicked(1) }"
              @click="toggleFeature(1)"
            >
              <div class="feature-header">
                <span class="feature-icon">📷</span>
                <h3 class="feature-title">专属相册</h3>
              </div>
              <p class="feature-description">
                上传和管理我们的合影照片，支持分类整理，每张照片都可以添加专属的回忆描述，打造属于我们的数字相册。
              </p>

            </div>

            <div 
              class="feature-card"
              :class="{ 'active': isFeatureClicked(2) }"
              @click="toggleFeature(2)"
            >
              <div class="feature-header">
                <span class="feature-icon">🎂</span>
                <h3 class="feature-title">纪念日管理</h3>
              </div>
              <p class="feature-description">
                记录所有重要的纪念日，包括相识日、恋爱日、生日等，系统会自动计算天数并提醒，让每个特殊日子都不会被遗忘。
              </p>

            </div>

            <div 
              class="feature-card"
              :class="{ 'active': isFeatureClicked(3) }"
              @click="toggleFeature(3)"
            >
              <div class="feature-header">
                <span class="feature-icon">🛡️</span>
                <h3 class="feature-title">隐私安全</h3>
              </div>
              <p class="feature-description">
                采用安全的用户认证系统，确保只有我们两个人可以访问和管理内容，所有数据都经过加密保护，守护我们的私密回忆。
              </p>

            </div>

            <div 
              class="feature-card"
              :class="{ 'active': isFeatureClicked(4) }"
              @click="toggleFeature(4)"
            >
              <div class="feature-header">
                <span class="feature-icon">📱</span>
                <h3 class="feature-title">响应式设计</h3>
              </div>
              <p class="feature-description">
                完美适配手机、平板和电脑等各种设备，无论在哪里都能随时查看我们的回忆，界面优雅美观，操作简单流畅。
              </p>

            </div>

            <div 
              class="feature-card"
              :class="{ 'active': isFeatureClicked(5) }"
              @click="toggleFeature(5)"
            >
              <div class="feature-header">
                <span class="feature-icon">⏰</span>
                <h3 class="feature-title">爱情计时器</h3>
              </div>
              <p class="feature-description">
                实时显示我们在一起的时间，精确到秒的爱情计时器，见证我们爱情的每一分每一秒，让时间成为爱的见证。
              </p>

            </div>
          </div>
        </div>

        <div class="about-card">
          <h2 class="section-title">技术栈</h2>
          <div class="tech-stack">
            <div class="tech-category">
              <h3>前端技术</h3>
              <ul>
                <li>Vue 3 + TypeScript</li>
                <li>Vue Router</li>
                <li>Pinia 状态管理</li>
                <li>CSS Variables</li>
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

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--romantic-spacing-6);
}

.feature-card {
  background: var(--romantic-white);
  border: 1px solid rgba(255, 107, 157, 0.1);
  border-radius: var(--romantic-radius);
  padding: var(--romantic-spacing-6);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: var(--romantic-shadow);
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--romantic-primary), var(--romantic-primary-light));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(255, 107, 157, 0.15);
}

.feature-card:hover::before {
  transform: scaleX(1);
}

.feature-card.active {
  background: var(--romantic-white);
  border-color: var(--romantic-primary);
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(255, 107, 157, 0.2);
}

.feature-card.active::before {
  transform: scaleX(1);
}

.feature-header {
  display: flex;
  align-items: center;
  gap: var(--romantic-spacing-3);
  margin-bottom: var(--romantic-spacing-4);
}

.feature-icon {
  font-size: 2rem;
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-icon {
  transform: scale(1.1);
}

.feature-card.active .feature-icon {
  transform: scale(1.15);
}

.feature-title {
  font-size: var(--romantic-font-size-lg);
  font-weight: var(--romantic-font-weight-bold);
  color: var(--romantic-dark);
  margin: 0;
}

.feature-card.active .feature-title {
  color: var(--romantic-primary-dark);
}

.feature-description {
  color: var(--romantic-dark);
  line-height: var(--romantic-line-height-relaxed);
  margin-bottom: 0;
  font-size: var(--romantic-font-size-sm);
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
  
  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--romantic-spacing-4);
  }
  
  .feature-card {
    padding: var(--romantic-spacing-4);
  }
  
  .feature-icon {
    font-size: 1.5rem;
  }
  
  .feature-title {
    font-size: var(--romantic-font-size-base);
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
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: var(--romantic-spacing-3);
  }
  
  .feature-card {
    padding: var(--romantic-spacing-3);
  }
  
  .feature-header {
    gap: var(--romantic-spacing-2);
    margin-bottom: var(--romantic-spacing-3);
  }
  
  .feature-icon {
    font-size: 1.25rem;
  }
  
  .feature-title {
    font-size: var(--romantic-font-size-sm);
  }
  
  .feature-description {
    font-size: var(--romantic-font-size-xs);
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
