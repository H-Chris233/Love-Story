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
  <div class="romantic-home">
    <section class="romantic-home-section">
      <div class="romantic-home-container">
        <div class="romantic-heart-container">
          <div class="romantic-heart">❤️</div>
        </div>
        
        <h1 class="romantic-title">我们的爱情故事</h1>
        <p class="romantic-subtitle">记录我们在一起的每一个美好瞬间</p>
        
        <!-- 恋爱天数计数器 -->
        <LoveTimer />
        
        <button 
          @click="goToMemories" 
          class="romantic-button"
        >
          查看我们的回忆
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.romantic-home {
  min-height: calc(100vh - 60px);
  background: var(--romantic-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--romantic-spacing-4);
}

.romantic-home-section {
  width: 100%;
}

.romantic-home-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--romantic-spacing-8);
  padding: var(--romantic-spacing-8) var(--romantic-spacing-12);
  background: rgba(255, 255, 255, 0.85);
  border-radius: var(--romantic-radius);
  box-shadow: var(--romantic-shadow);
  backdrop-filter: blur(10px);
}

.romantic-heart-container {
  animation: romanticHeartbeat 1.5s ease-in-out infinite;
}

.romantic-heart {
  font-size: var(--romantic-font-size-4xl);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.romantic-title {
  font-size: var(--romantic-font-size-3xl);
  font-weight: var(--romantic-font-weight-bold);
  margin-bottom: var(--romantic-spacing-4);
  color: var(--romantic-primary-dark);
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.romantic-subtitle {
  font-size: var(--romantic-font-size-xl);
  margin-bottom: var(--romantic-spacing-8);
  color: var(--romantic-secondary);
  text-align: center;
  line-height: 1.6;
}

.romantic-button {
  background: var(--romantic-primary);
  color: var(--romantic-white);
  font-size: var(--romantic-font-size-lg);
  font-weight: var(--romantic-font-weight-semibold);
  padding: var(--romantic-spacing-4) var(--romantic-spacing-12);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: var(--romantic-transition);
  box-shadow: var(--romantic-shadow);
  position: relative;
  overflow: hidden;
}

.romantic-button:hover {
  background: var(--romantic-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--romantic-shadow-hover);
}

.romantic-button:active {
  transform: translateY(0);
}

/* 心跳动画 */
@keyframes romanticHeartbeat {
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

/* 按钮点击波纹效果 */
.romantic-button::after {
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

.romantic-button:focus:not(:active)::after {
  animation: romanticRipple 1s ease-out;
}

/* 波纹动画 */
@keyframes romanticRipple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  100% {
    transform: scale(50, 50);
    opacity: 0;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .romantic-home {
    padding: var(--romantic-spacing-2);
  }
  
  .romantic-home-container {
    padding: var(--romantic-spacing-6) var(--romantic-spacing-4);
    gap: var(--romantic-spacing-6);
  }
  
  .romantic-heart {
    font-size: 2.5rem;
  }
  
  .romantic-title {
    font-size: 1.8rem;
    margin-bottom: var(--romantic-spacing-3);
  }
  
  .romantic-subtitle {
    font-size: var(--romantic-font-size-lg);
    margin-bottom: var(--romantic-spacing-6);
  }
  
  .romantic-button {
    font-size: var(--romantic-font-size-base);
    padding: var(--romantic-spacing-3) var(--romantic-spacing-8);
  }
}

@media (max-width: 480px) {
  .romantic-home-container {
    padding: var(--romantic-spacing-4) var(--romantic-spacing-2);
    gap: var(--romantic-spacing-4);
  }
  
  .romantic-heart {
    font-size: 2rem;
  }
  
  .romantic-title {
    font-size: 1.5rem;
  }
  
  .romantic-subtitle {
    font-size: var(--romantic-font-size-base);
  }
  
  .romantic-button {
    font-size: var(--romantic-font-size-sm);
    padding: var(--romantic-spacing-3) var(--romantic-spacing-6);
  }
}
</style>