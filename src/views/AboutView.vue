<script setup lang="ts">
// About页面组件
</script>

<template>
  <div class="about-page">
    <div class="container">
      <header class="page-header">
        <h1 class="text-3xl font-bold text-center mb-8">关于我们</h1>
        <p class="text-center text-gray-600 mb-10">记录我们的爱情故事，珍藏美好回忆</p>
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
            <li class="feature-item">
              <span class="feature-icon">📅</span>
              <span><strong>回忆时光轴：</strong>按时间顺序记录我们的爱情历程</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">📸</span>
              <span><strong>照片相册：</strong>珍藏我们的每一张合影</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">🎉</span>
              <span><strong>纪念日提醒：</strong>重要日子提醒，不再错过</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">🔒</span>
              <span><strong>隐私保护：</strong>只有我们两个人可以访问</span>
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
.about-page {
  padding: 2rem 1rem;
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, #f0f9ff 0%, #fdf2f8 100%);
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
}

.page-header p {
  font-size: 1.1rem;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.about-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 2rem;
  transition: transform 0.3s ease;
}

.about-card:hover {
  transform: translateY(-3px);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #db2777; /* pink-600 */
  border-bottom: 2px solid #fce7f3; /* pink-100 */
  padding-bottom: 0.5rem;
}

.section-content {
  color: #666;
  line-height: 1.7;
  font-size: 1.1rem;
}

.features-list {
  list-style: none;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: #f8fafc; /* slate-50 */
  transition: background 0.2s ease;
}

.feature-item:hover {
  background: #f1f5f9; /* slate-100 */
}

.feature-icon {
  font-size: 1.5rem;
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
  color: #333;
}

.tech-category ul {
  list-style: none;
}

.tech-category li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e2e8f0; /* slate-200 */
  color: #666;
}

.tech-category li:last-child {
  border-bottom: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .about-page {
    padding: 1rem;
  }
  
  .about-card {
    padding: 1.5rem;
  }
  
  .section-content {
    font-size: 1rem;
  }
  
  .tech-stack {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    margin-bottom: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
  }
  
  .page-header p {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  
  .content-section {
    gap: 1.5rem;
  }
  
  .section-title {
    font-size: 1.3rem;
  }
  
  .feature-item {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .feature-icon {
    font-size: 1.3rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .about-page {
    padding: 0.5rem;
  }
  
  .container {
    padding: 0;
  }
  
  .about-card {
    padding: 1rem;
    border-radius: 8px;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .page-header p {
    font-size: 0.9rem;
  }
  
  .content-section {
    gap: 1rem;
  }
  
  .section-title {
    font-size: 1.2rem;
    margin-bottom: 0.75rem;
  }
  
  .section-content {
    font-size: 0.9rem;
    line-height: 1.6;
  }
  
  .feature-item {
    padding: 0.5rem;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .feature-icon {
    font-size: 1.1rem;
  }
  
  .tech-category h3 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }
  
  .tech-category li {
    padding: 0.25rem 0;
    font-size: 0.9rem;
  }
}
</style>
