<script setup lang="ts">
import { useRouter } from 'vue-router'
import LoveTimer from '../components/LoveTimer.vue'

const router = useRouter()

// 跳转到回忆页面
const goToMemories = () => {
  router.push('/memories')
}
</script>

<template>
  <div class="home-page">
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">我们的爱情故事</h1>
        <p class="hero-subtitle">记录我们在一起的每一个美好瞬间</p>
        
        <!-- 恋爱天数计数器 -->
        <LoveTimer />
        
        <button 
          @click="goToMemories" 
          class="cta-button"
        >
          查看我们的回忆
        </button>
      </div>
    </section>

    <section class="features-section">
      <div class="container">
        <h2 class="section-title">功能特色</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📅</div>
            <h3 class="feature-title">时光轴</h3>
            <p class="feature-description">按时间顺序记录我们的爱情历程</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📸</div>
            <h3 class="feature-title">照片相册</h3>
            <p class="feature-description">珍藏我们的每一张合影</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">🎉</div>
            <h3 class="feature-title">纪念日</h3>
            <p class="feature-description">重要日子提醒，不再错过</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  min-height: calc(100vh - 60px);
}

.hero-section {
  padding: 4rem 1rem;
  text-align: center;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: #db2777; /* pink-600 */
}

.hero-subtitle {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #7e22ce; /* purple-700 */
}

.cta-button {
  background: #ec4899; /* pink-500 */
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  padding: 1rem 2rem;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.cta-button:hover {
  background: #db2777; /* pink-600 */
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.features-section {
  padding: 4rem 1rem;
  background: white;
}

.section-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 3rem;
  color: #333;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.feature-card {
  background: #fdf2f8; /* pink-50 */
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #db2777; /* pink-600 */
}

.feature-description {
  color: #666;
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1.2rem;
  }
  
  .cta-button {
    font-size: 1rem;
    padding: 0.75rem 1.5rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .features-grid {
    gap: 1.5rem;
  }
  
  .feature-card {
    padding: 1.5rem;
  }
  
  .feature-title {
    font-size: 1.3rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .hero-section {
    padding: 2rem 1rem;
  }
  
  .hero-title {
    font-size: 1.8rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .cta-button {
    font-size: 0.9rem;
    padding: 0.7rem 1.2rem;
  }
  
  .features-section {
    padding: 2rem 1rem;
  }
  
  .section-title {
    font-size: 1.3rem;
    margin-bottom: 2rem;
  }
  
  .features-grid {
    gap: 1rem;
  }
  
  .feature-card {
    padding: 1rem;
  }
  
  .feature-icon {
    font-size: 2rem;
  }
  
  .feature-title {
    font-size: 1.2rem;
  }
  
  .feature-description {
    font-size: 0.9rem;
  }
}
</style>
