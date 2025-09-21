<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MemoryCard from '../components/MemoryCard.vue'

// 定义记忆数据类型
interface Memory {
  id: number
  title: string
  date: string
  content: string
  image?: string
}

// 模拟记忆数据
const memories = ref<Memory[]>([
  {
    id: 1,
    title: '初次相遇',
    date: '2020-01-01',
    content: '那是一个阳光明媚的下午，在咖啡厅里我们第一次相遇。你穿着白色的毛衣，笑容如花。',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470'
  },
  {
    id: 2,
    title: '第一次约会',
    date: '2020-01-15',
    content: '我们第一次约会去了公园，一起喂鸭子，一起看夕阳。那是我最美好的回忆之一。',
    image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963'
  },
  {
    id: 3,
    title: '第一次旅行',
    date: '2020-03-20',
    content: '我们第一次一起旅行，去了海边城市。在沙滩上我们一起堆沙堡，看日出。',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470'
  }
])

// 页面加载时的处理
onMounted(() => {
  console.log('Memories page loaded')
})
</script>

<template>
  <div class="memories-page">
    <header class="page-header">
      <h1 class="text-3xl font-bold text-center mb-8">我们的爱情回忆</h1>
      <p class="text-center text-gray-600 mb-10">记录我们在一起的每一个美好时刻</p>
    </header>

    <div class="memory-timeline">
      <div v-for="memory in memories" :key="memory.id" class="memory-item">
        <MemoryCard :memory="memory" />
      </div>
    </div>

    <div class="text-center mt-10">
      <button class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300">
        添加新的回忆
      </button>
    </div>
  </div>
</template>

<style scoped>
.memories-page {
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

.memory-timeline {
  position: relative;
}

/* 时间轴线 */
.memory-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ec4899; /* pink-500 */
}

.memory-item {
  margin-bottom: 2rem;
}

.memory-item:last-child {
  margin-bottom: 0;
}

/* 响应式设计 */
@media (min-width: 768px) {
  .memory-timeline::before {
    left: 50%;
    transform: translateX(-50%);
  }
  
  .memories-page {
    padding: 2rem;
  }
  
  .page-header h1 {
    font-size: 2.5rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 768px) {
  .memories-page {
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
  
  .memory-timeline::before {
    left: 15px;
  }
  
  .memory-item {
    margin-bottom: 1.5rem;
  }
  
  .text-center {
    margin-top: 2rem;
  }
}

@media (max-width: 480px) {
  .memories-page {
    padding: 0.5rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .page-header p {
    font-size: 0.9rem;
  }
  
  .memory-timeline::before {
    left: 12px;
  }
  
  .memory-item {
    margin-bottom: 1rem;
  }
}
</style>