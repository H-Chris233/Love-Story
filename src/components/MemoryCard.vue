<script setup lang="ts">
import { defineProps } from 'vue'

// 定义记忆数据类型
interface Memory {
  id: number
  title: string
  date: string
  content: string
  image?: string
}

// 定义组件Props
const props = defineProps<{
  memory: Memory
}>()

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="memory-card">
    <div class="card-content">
      <div class="date-tag">
        {{ formatDate(memory.date) }}
      </div>
      
      <h2 class="memory-title">{{ memory.title }}</h2>
      
      <p class="memory-content">
        {{ memory.content }}
      </p>
      
      <div v-if="memory.image" class="memory-image">
        <img :src="memory.image" :alt="memory.title" class="rounded-lg shadow-md">
      </div>
      
      <div class="card-actions">
        <button class="action-button">
          编辑
        </button>
        <button class="action-button delete-button">
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-card {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  margin-left: 40px;
}

.memory-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.card-content {
  padding: 1.5rem;
}

.date-tag {
  position: absolute;
  top: -12px;
  left: -12px;
  background: #ec4899; /* pink-500 */
  color: white;
  font-weight: bold;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.memory-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.75rem;
  color: #333;
}

.memory-content {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1.25rem;
}

.memory-image {
  margin-bottom: 1.25rem;
}

.memory-image img {
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: cover;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
}

.action-button {
  padding: 0.5rem 1rem;
  background: #f3f4f6; /* gray-100 */
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.action-button:hover {
  background: #e5e7eb; /* gray-200 */
}

.delete-button {
  background: #fee2e2; /* red-100 */
  color: #ef4444; /* red-500 */
}

.delete-button:hover {
  background: #fecaca; /* red-200 */
}

/* 在大屏幕上，记忆卡片居中显示 */
@media (min-width: 768px) {
  .memory-card {
    margin-left: auto;
    margin-right: auto;
    width: 80%;
  }
  
  .memory-card:nth-child(odd) {
    margin-right: 40px;
    margin-left: auto;
  }
  
  .memory-card:nth-child(even) {
    margin-left: 40px;
    margin-right: auto;
  }
}

/* 小屏手机优化 */
@media (max-width: 768px) {
  .memory-card {
    margin-left: 30px;
    margin-right: 1rem;
  }
  
  .card-content {
    padding: 1rem;
  }
  
  .date-tag {
    top: -10px;
    left: -10px;
    padding: 0.2rem 0.6rem;
    font-size: 0.75rem;
  }
  
  .memory-title {
    font-size: 1.3rem;
    margin-bottom: 0.5rem;
  }
  
  .memory-content {
    font-size: 0.95rem;
    margin-bottom: 1rem;
  }
  
  .memory-image {
    margin-bottom: 1rem;
  }
  
  .memory-image img {
    max-height: 200px;
  }
  
  .card-actions {
    gap: 0.5rem;
  }
  
  .action-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .memory-card {
    margin-left: 25px;
    margin-right: 0.5rem;
  }
  
  .card-content {
    padding: 0.75rem;
  }
  
  .date-tag {
    top: -8px;
    left: -8px;
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
  }
  
  .memory-title {
    font-size: 1.1rem;
    margin-bottom: 0.4rem;
  }
  
  .memory-content {
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
    line-height: 1.5;
  }
  
  .memory-image {
    margin-bottom: 0.75rem;
  }
  
  .memory-image img {
    max-height: 150px;
  }
  
  .card-actions {
    gap: 0.4rem;
  }
  
  .action-button {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }
}
</style>