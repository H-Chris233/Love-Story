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
  <div class="romantic-home romantic-fade-in">
    <section class="romantic-home-section">
      <div class="romantic-home-container romantic-card">
        <div class="romantic-heart-container romantic-heartbeat">
          <div class="romantic-heart">❤️</div>
        </div>
        
        <h1 class="romantic-title romantic-title-md romantic-title-prominent">我们的爱情故事</h1>
        <p class="romantic-subtitle romantic-text-primary">记录我们在一起的每一个美好瞬间</p>
        
        <!-- 恋爱天数计数器 -->
        <LoveTimer />
        
        <button 
          @click="goToMemories" 
          class="romantic-button romantic-button-lg romantic-ripple"
        >
          查看我们的回忆
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.romantic-home {
  min-height: calc(100vh - 70px);
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--romantic-radius-lg);
  box-shadow: var(--romantic-shadow-lg);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.romantic-heart-container {
  margin-top: var(--romantic-spacing-4);
}

.romantic-heart {
  font-size: var(--romantic-font-size-4xl);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.romantic-title-prominent {
  text-shadow: 
    2px 2px 0px #000,
    -1px -1px 0px #000,
    1px -1px 0px #000,
    -1px 1px 0px #000,
    2px 2px 8px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(0, 0, 0, 0.5);
  color: #ffffff;
  font-weight: 800;
  letter-spacing: 1px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .romantic-home {
    padding: var(--romantic-spacing-2);
  }
  
  .romantic-home-container {
    padding: var(--romantic-spacing-6) var(--romantic-spacing-4);
    gap: var(--romantic-spacing-6);
    border-radius: var(--romantic-radius);
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