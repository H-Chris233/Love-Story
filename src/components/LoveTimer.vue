<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// 设置开始日期（可以根据实际情况修改）
const startDate = new Date('2020-01-01')

// 响应式数据
const daysTogether = ref(0)
const hoursTogether = ref(0)
const minutesTogether = ref(0)
const secondsTogether = ref(0)

// 计算在一起的总天数
const calculateDaysTogether = () => {
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - startDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60))
  const diffSeconds = Math.floor((diffTime % (1000 * 60)) / 1000)
  
  daysTogether.value = diffDays
  hoursTogether.value = diffHours
  minutesTogether.value = diffMinutes
  secondsTogether.value = diffSeconds
}

// 格式化开始日期
const formattedStartDate = computed(() => {
  return startDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// 定时器引用
let timer: number | null = null

// 组件挂载时启动计时器
onMounted(() => {
  calculateDaysTogether()
  timer = window.setInterval(calculateDaysTogether, 1000)
})

// 组件卸载前清理定时器
onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="romantic-card love-timer">
    <div class="romantic-card-header">
      <h2 class="romantic-card-title romantic-text-center">我们在一起</h2>
    </div>
    
    <div class="romantic-card-body">
      <div class="romantic-grid romantic-grid-cols-4 romantic-gap-2">
        <div class="time-unit romantic-card romantic-card-body romantic-p-2">
          <span class="time-value">{{ daysTogether }}</span>
          <span class="time-label">天</span>
        </div>
        <div class="time-unit romantic-card romantic-card-body romantic-p-2">
          <span class="time-value">{{ hoursTogether }}</span>
          <span class="time-label">小时</span>
        </div>
        <div class="time-unit romantic-card romantic-card-body romantic-p-2">
          <span class="time-value">{{ minutesTogether }}</span>
          <span class="time-label">分钟</span>
        </div>
        <div class="time-unit romantic-card romantic-card-body romantic-p-2">
          <span class="time-value">{{ secondsTogether }}</span>
          <span class="time-label">秒</span>
        </div>
      </div>
      
      <div class="romantic-text romantic-text-center romantic-text-secondary romantic-mt-4">
        从 {{ formattedStartDate }} 开始
      </div>
    </div>
  </div>
</template>

<style scoped>
.love-timer {
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid var(--romantic-primary-light);
}

.time-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--romantic-light);
  border-radius: var(--romantic-radius);
  box-shadow: var(--romantic-shadow);
  transition: var(--romantic-transition);
}

.time-unit:hover {
  transform: translateY(-3px);
  box-shadow: var(--romantic-shadow-hover);
}

.time-value {
  font-size: var(--romantic-font-size-3xl);
  font-weight: var(--romantic-font-weight-bold);
  color: var(--romantic-primary);
  text-align: center;
}

.time-label {
  font-size: var(--romantic-font-size-sm);
  color: var(--romantic-dark-medium);
  margin-top: var(--romantic-spacing-1);
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .romantic-grid {
    gap: var(--romantic-spacing-2);
  }
  
  .time-value {
    font-size: var(--romantic-font-size-2xl);
  }
  
  .time-label {
    font-size: var(--romantic-font-size-xs);
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .romantic-grid {
    gap: var(--romantic-spacing-1);
  }
  
  .time-unit {
    padding: var(--romantic-spacing-1) !important;
  }
  
  .time-value {
    font-size: var(--romantic-font-size-xl);
  }
  
  .time-label {
    font-size: var(--romantic-font-size-xs);
    margin-top: 0;
  }
}

@media (max-width: 360px) {
  .time-value {
    font-size: var(--romantic-font-size-lg);
  }
}
</style>