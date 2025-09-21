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
        <div class="heart-animation">
          <div class="heart">❤️</div>
        </div>
        
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
  </div>
</template>

<style scoped>
.home-page {
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-section {
  padding: 2rem 1rem;
  text-align: center;
  width: 100%;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem 1rem;
}

.heart-animation {
  animation: heartbeat 1.5s ease-in-out infinite;
}

.heart {
  font-size: 3rem;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: #db2777; /* pink-600 */
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  color: #7e22ce; /* purple-700 */
  line-height: 1.6;
}

.cta-button {
  background: #ec4899; /* pink-500 */
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  padding: 1rem 2.5rem;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.cta-button:hover {
  background: #db2777; /* pink-600 */
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.cta-button:active {
  transform: translateY(0);
}

/* 按钮点击波纹效果 */
.cta-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%);
  transform-origin: 50% 50%;
}

.cta-button:focus:not(:active)::after {
  animation: ripple 1s ease-out;
}

/* 心跳动画 */
@keyframes heartbeat {
  0% {
    transform: scale(1);
  }
  5% {
    transform: scale(1.1);
  }
  10% {
    transform: scale(1);
  }
  15% {
    transform: scale(1.1);
  }
  20% {
    transform: scale(1);
  }
  100% {
    transform: scale(1);
  }
}

/* 波纹动画 */
@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  100% {
    transform: scale(50, 50);
    opacity: 0;
  }
}

/* 平板设备优化 */
@media (min-width: 768px) {
  .hero-section {
    padding: 4rem 1rem;
  }
  
  .hero-content {
    padding: 3rem 2rem;
  }
  
  .heart {
    font-size: 4rem;
  }
  
  .hero-title {
    font-size: 3rem;
  }
  
  .hero-subtitle {
    font-size: 1.5rem;
  }
  
  .cta-button {
    font-size: 1.25rem;
    padding: 1rem 2.5rem;
  }
}

/* 大屏幕优化 */
@media (min-width: 1024px) {
  .hero-title {
    font-size: 3.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.75rem;
  }
  
  .cta-button {
    font-size: 1.35rem;
    padding: 1.25rem 3rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .hero-content {
    padding: 1.5rem 1rem;
    gap: 1.5rem;
  }
  
  .heart {
    font-size: 2.5rem;
  }
  
  .hero-title {
    font-size: 1.8rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .cta-button {
    font-size: 1rem;
    padding: 0.8rem 2rem;
  }
}

/* 超小屏手机优化 */
@media (max-width: 360px) {
  .hero-title {
    font-size: 1.5rem;
  }
  
  .hero-subtitle {
    font-size: 0.9rem;
  }
  
  .cta-button {
    font-size: 0.9rem;
    padding: 0.7rem 1.5rem;
  }
}
</style>