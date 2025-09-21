<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 定义纪念日数据类型
interface Anniversary {
  id: number
  title: string
  date: string
  isAnnual: boolean
  daysUntil: number
}

// 模拟纪念日数据
const anniversaries = ref<Anniversary[]>([
  {
    id: 1,
    title: '初次相遇',
    date: '2020-01-01',
    isAnnual: true,
    daysUntil: 15
  },
  {
    id: 2,
    title: '第一次约会',
    date: '2020-01-15',
    isAnnual: true,
    daysUntil: 29
  },
  {
    id: 3,
    title: '确定关系',
    date: '2020-02-14',
    isAnnual: true,
    daysUntil: 58
  },
  {
    id: 4,
    title: '第一次旅行',
    date: '2020-03-20',
    isAnnual: true,
    daysUntil: 98
  }
])

// 页面加载时的处理
onMounted(() => {
  console.log('Anniversaries page loaded')
})

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 获取倒计时文本
const getDaysUntilText = (days: number) => {
  if (days === 0) {
    return '今天'
  } else if (days < 0) {
    return `已过 ${Math.abs(days)} 天`
  } else {
    return `还有 ${days} 天`
  }
}
</script>

<template>
  <div class="anniversaries-page">
    <header class="page-header">
      <h1 class="text-3xl font-bold text-center mb-8">重要纪念日</h1>
      <p class="text-center text-gray-600 mb-10">记录我们的重要日子，不再错过任何美好时刻</p>
    </header>

    <div class="anniversaries-list">
      <div 
        v-for="anniversary in anniversaries" 
        :key="anniversary.id" 
        class="anniversary-card"
      >
        <div class="card-header">
          <h2 class="anniversary-title">{{ anniversary.title }}</h2>
          <span 
            class="annual-badge" 
            :class="{ 'annual': anniversary.isAnnual }"
          >
            {{ anniversary.isAnnual ? '每年' : '单次' }}
          </span>
        </div>
        
        <div class="card-body">
          <p class="anniversary-date">{{ formatDate(anniversary.date) }}</p>
          <p class="days-until" :class="{ 'today': anniversary.daysUntil === 0, 'past': anniversary.daysUntil < 0 }">
            {{ getDaysUntilText(anniversary.daysUntil) }}
          </p>
        </div>
      </div>
    </div>

    <div class="text-center mt-10">
      <button class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300">
        添加纪念日
      </button>
    </div>
  </div>
</template>

<style scoped>
.anniversaries-page {
  padding: 2rem;
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

.anniversaries-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.anniversary-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.anniversary-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.anniversary-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
}

.annual-badge {
  background: #dbeafe; /* blue-100 */
  color: #1d4ed8; /* blue-700 */
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.annual-badge.annual {
  background: #fce7f3; /* pink-100 */
  color: #db2777; /* pink-600 */
}

.card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.anniversary-date {
  font-size: 1.1rem;
  color: #666;
}

.days-until {
  font-size: 1.1rem;
  font-weight: 600;
  color: #3b82f6; /* blue-500 */
}

.days-until.today {
  color: #10b981; /* green-500 */
}

.days-until.past {
  color: #ef4444; /* red-500 */
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-body {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .anniversary-date {
    font-size: 1rem;
  }
  
  .days-until {
    font-size: 1rem;
  }
  
  .anniversaries-page {
    padding: 1rem;
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
  
  .anniversary-card {
    padding: 1rem;
  }
  
  .anniversary-title {
    font-size: 1.3rem;
  }
  
  .annual-badge {
    padding: 0.2rem 0.6rem;
    font-size: 0.8rem;
  }
  
  .text-center {
    margin-top: 2rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .anniversaries-page {
    padding: 0.5rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .page-header p {
    font-size: 0.9rem;
  }
  
  .anniversary-card {
    padding: 0.75rem;
  }
  
  .card-header {
    margin-bottom: 0.75rem;
  }
  
  .anniversary-title {
    font-size: 1.2rem;
  }
  
  .annual-badge {
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .anniversary-date {
    font-size: 0.9rem;
  }
  
  .days-until {
    font-size: 0.9rem;
  }
}
</style>