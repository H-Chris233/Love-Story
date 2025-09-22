<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

// 定义记忆数据类型
interface Memory {
  id: number | string
  title: string
  date: string
  content: string
  images?: string[]
}

// 定义组件Props
const props = defineProps<{
  memory: Memory
}>()

// 定义组件Emits
const emit = defineEmits<{
  edit: [memory: Memory]
  delete: [id: number | string]
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

// 处理编辑事件
const handleEdit = () => {
  emit('edit', props.memory)
}

// 处理删除事件
const handleDelete = () => {
  if (confirm('确定要删除这个回忆吗？')) {
    emit('delete', props.memory.id)
  }
}
</script>

<template>
  <div class="romantic-memory-card">
    <div class="romantic-card-content">
      <div class="romantic-date-tag">
        {{ formatDate(memory.date) }}
      </div>
      
      <h2 class="romantic-memory-title">{{ memory.title }}</h2>
      
      <p class="romantic-memory-content">
        {{ memory.content }}
      </p>
      
      <div v-if="memory.images && memory.images.length > 0" class="romantic-memory-images">
        <div v-for="(image, index) in memory.images" :key="index" class="romantic-memory-image">
          <img :src="image" :alt="`${memory.title} - 图片 ${index + 1}`">
        </div>
      </div>
      
      <div class="romantic-card-actions">
        <button class="romantic-action-button" @click="handleEdit">
          编辑
        </button>
        <button class="romantic-action-button romantic-delete-button" @click="handleDelete">
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.romantic-memory-card {
  position: relative;
  background: var(--romantic-white);
  border-radius: var(--romantic-radius);
  box-shadow: var(--romantic-shadow);
  overflow: hidden;
  transition: var(--romantic-transition);
  margin-left: 40px;
  border: 1px solid rgba(255, 107, 157, 0.1);
}

.romantic-memory-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--romantic-shadow-hover);
}

.romantic-card-content {
  padding: var(--romantic-spacing-6);
}

.romantic-date-tag {
  position: absolute;
  top: -12px;
  left: -12px;
  background: var(--romantic-primary);
  color: var(--romantic-white);
  font-weight: var(--romantic-font-weight-bold);
  padding: var(--romantic-spacing-1) var(--romantic-spacing-3);
  border-radius: 20px;
  font-size: var(--romantic-font-size-sm);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.romantic-memory-title {
  font-size: var(--romantic-font-size-2xl);
  font-weight: var(--romantic-font-weight-bold);
  margin-bottom: var(--romantic-spacing-3);
  color: var(--romantic-dark);
}

.romantic-memory-content {
  color: var(--romantic-dark);
  line-height: 1.6;
  margin-bottom: var(--romantic-spacing-5);
}

.romantic-memory-image {
  margin-bottom: var(--romantic-spacing-5);
  border-radius: var(--romantic-radius);
  overflow: hidden;
}

.romantic-memory-image img {
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: cover;
  transition: var(--romantic-transition);
}

.romantic-memory-image img:hover {
  transform: scale(1.02);
}

.romantic-card-actions {
  display: flex;
  gap: var(--romantic-spacing-3);
}

.romantic-action-button {
  padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
  background: var(--romantic-gray);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: var(--romantic-font-weight-medium);
  transition: var(--romantic-transition);
}

.romantic-action-button:hover {
  background: var(--romantic-light);
}

.romantic-delete-button {
  background: var(--romantic-gray);
  color: var(--romantic-danger);
}

.romantic-delete-button:hover {
  background: #fee2e2; /* red-100 */
}

/* 在大屏幕上，记忆卡片居中显示 */
@media (min-width: 768px) {
  .romantic-memory-card {
    margin-left: auto;
    margin-right: auto;
    width: 80%;
  }
  
  .romantic-memory-card:nth-child(odd) {
    margin-right: 40px;
    margin-left: auto;
  }
  
  .romantic-memory-card:nth-child(even) {
    margin-left: 40px;
    margin-right: auto;
  }
}

/* 小屏手机优化 */
@media (max-width: 768px) {
  .romantic-memory-card {
    margin-left: 30px;
    margin-right: 1rem;
  }
  
  .romantic-card-content {
    padding: var(--romantic-spacing-4);
  }
  
  .romantic-date-tag {
    top: -10px;
    left: -10px;
    padding: 0.2rem 0.6rem;
    font-size: 0.75rem;
  }
  
  .romantic-memory-title {
    font-size: 1.3rem;
    margin-bottom: 0.5rem;
  }
  
  .romantic-memory-content {
    font-size: 0.95rem;
    margin-bottom: 1rem;
  }
  
  .romantic-memory-image {
    margin-bottom: 1rem;
  }
  
  .romantic-memory-image img {
    max-height: 200px;
  }
  
  .romantic-card-actions {
    gap: 0.5rem;
  }
  
  .romantic-action-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .romantic-memory-card {
    margin-left: 25px;
    margin-right: 0.5rem;
  }
  
  .romantic-card-content {
    padding: 0.75rem;
  }
  
  .romantic-date-tag {
    top: -8px;
    left: -8px;
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
  }
  
  .romantic-memory-title {
    font-size: 1.1rem;
    margin-bottom: 0.4rem;
  }
  
  .romantic-memory-content {
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
    line-height: 1.5;
  }
  
  .romantic-memory-image {
    margin-bottom: 0.75rem;
  }
  
  .romantic-memory-image img {
    max-height: 150px;
  }
  
  .romantic-card-actions {
    gap: 0.4rem;
  }
  
  .romantic-action-button {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }
}
</style>