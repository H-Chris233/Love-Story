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
  <div class="love-timer">
    <div class="timer-header">
      <h2 class="timer-title">我们在一起</h2>
    </div>
    
    <div class="timer-content">
      <div class="time-units">
        <div class="time-unit">
          <span class="time-value">{{ daysTogether }}</span>
          <span class="time-label">天</span>
        </div>
        <div class="time-unit">
          <span class="time-value">{{ hoursTogether }}</span>
          <span class="time-label">小时</span>
        </div>
        <div class="time-unit">
          <span class="time-value">{{ minutesTogether }}</span>
          <span class="time-label">分钟</span>
        </div>
        <div class="time-unit">
          <span class="time-value">{{ secondsTogether }}</span>
          <span class="time-label">秒</span>
        </div>
      </div>
      
      <div class="start-date">
        从 {{ formattedStartDate }} 开始
      </div>
    </div>
  </div>
</template>

<style scoped>
.love-timer {
  background: linear-gradient(to bottom right, #f0f9ff, #fdf2f8);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #fbcfe8;
  max-width: 600px;
  margin: 0 auto;
}

.timer-header {
  margin-bottom: 1.5rem;
}

.timer-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #db2777; /* pink-600 */
  margin: 0;
}

.timer-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.time-units {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.time-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #ec4899; /* pink-500 */
  background: white;
  padding: 0.5rem;
  border-radius: 12px;
  min-width: 80px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.time-label {
  font-size: 1rem;
  color: #4b5563; /* gray-600 */
  margin-top: 0.5rem;
}

.start-date {
  font-size: 1.1rem;
  color: #7e22ce; /* purple-700 */
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .love-timer {
    padding: 1.5rem;
  }
  
  .timer-title {
    font-size: 1.5rem;
  }
  
  .time-value {
    font-size: 2rem;
    min-width: 60px;
    padding: 0.5rem;
  }
  
  .time-label {
    font-size: 0.9rem;
  }
  
  .start-date {
    font-size: 1rem;
  }
  
  .time-units {
    gap: 0.75rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .love-timer {
    padding: 1rem;
    border-radius: 12px;
  }
  
  .timer-title {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
  
  .time-units {
    gap: 0.5rem;
  }
  
  .time-unit {
    flex: 1;
    min-width: 0;
  }
  
  .time-value {
    font-size: 1.5rem;
    min-width: 45px;
    padding: 0.4rem 0.6rem;
  }
  
  .time-label {
    font-size: 0.8rem;
    margin-top: 0.3rem;
  }
  
  .start-date {
    font-size: 0.9rem;
  }
}

@media (max-width: 360px) {
  .time-value {
    font-size: 1.3rem;
    min-width: 40px;
    padding: 0.3rem 0.5rem;
  }
  
  .time-label {
    font-size: 0.75rem;
  }
  
  .start-date {
    font-size: 0.8rem;
  }
}
</style>