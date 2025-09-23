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

// 获取完整的图片URL
const getFullImageUrl = (imageUrl: string) => {
  // 如果URL已经是完整的URL，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // 在开发环境中，使用Vite代理，直接返回相对路径
  if (import.meta.env.DEV) {
    console.log('Development mode - using proxy for image:', imageUrl)
    return imageUrl
  }
  
  // 在生产环境中，构建完整URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const serverUrl = baseUrl.replace('/api', '')
  const fullUrl = `${serverUrl}${imageUrl}`
  
  console.log('Production mode - image URL construction:', { imageUrl, baseUrl, serverUrl, fullUrl })
  return fullUrl
}

// 获取图片布局类名
const getImageLayoutClass = (imageCount: number) => {
  if (imageCount === 1) return 'single-image'
  if (imageCount === 2) return 'two-images'
  if (imageCount === 3) return 'three-images'
  return 'multiple-images'
}

// 获取单个图片容器的类名
const getImageContainerClass = (totalCount: number, index: number) => {
  if (totalCount === 3 && index === 0) return 'main-image'
  if (totalCount === 3 && index > 0) return 'side-image'
  return ''
}
</script>

<template>
  <div class="romantic-memory-card romantic-card">
    <div class="romantic-card-content">
      <div class="romantic-date-tag">
        {{ formatDate(memory.date) }}
      </div>
      
      <h2 class="romantic-memory-title romantic-card-title">{{ memory.title }}</h2>
      
      <p class="romantic-memory-content romantic-text">
        {{ memory.content }}
      </p>
      
      <div v-if="memory.images && memory.images.length > 0" class="romantic-memory-images">
        <div class="image-gallery" :class="getImageLayoutClass(memory.images.length)">
          <div 
            v-for="(image, index) in memory.images" 
            :key="index" 
            class="image-container"
            :class="getImageContainerClass(memory.images.length, index)"
          >
            <img 
              :src="getFullImageUrl(image)" 
              :alt="`${memory.title} - 图片 ${index + 1}`" 
              class="memory-image"
            >
          </div>
        </div>
      </div>
      
      <div class="romantic-card-actions romantic-flex romantic-gap-2 romantic-mt-4">
        <button class="romantic-action-button romantic-button romantic-button-sm" @click="handleEdit">
          编辑
        </button>
        <button class="romantic-action-button romantic-button romantic-button-sm romantic-button-outline" @click="handleDelete">
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
  border-radius: var(--romantic-radius-lg);
  box-shadow: var(--romantic-shadow);
  overflow: hidden;
  transition: var(--romantic-transition);
  margin-left: 40px;
  border: 1px solid rgba(255, 107, 157, 0.15);
  backdrop-filter: blur(10px);
}

.romantic-memory-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--romantic-gradient);
  z-index: 1;
}

.romantic-memory-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--romantic-shadow-lg);
  border-color: rgba(255, 107, 157, 0.3);
}

.romantic-card-content {
  padding: var(--romantic-spacing-6);
  position: relative;
  z-index: 2;
}

.romantic-date-tag {
  position: absolute;
  top: -15px;
  left: -15px;
  background: var(--romantic-gradient);
  color: var(--romantic-white);
  font-weight: var(--romantic-font-weight-bold);
  padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
  border-radius: var(--romantic-radius-full);
  font-size: var(--romantic-font-size-sm);
  box-shadow: var(--romantic-shadow);
  z-index: 3;
  border: 2px solid var(--romantic-white);
}

.romantic-memory-title {
  font-size: var(--romantic-font-size-2xl);
  font-weight: var(--romantic-font-weight-bold);
  margin-bottom: var(--romantic-spacing-3);
  color: var(--romantic-dark);
  background: var(--romantic-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: var(--romantic-line-height-tight);
}

.romantic-memory-content {
  color: var(--romantic-dark-medium);
  line-height: var(--romantic-line-height-relaxed);
  margin-bottom: var(--romantic-spacing-5);
  font-size: var(--romantic-font-size-lg);
}

/* 图片画廊样式 */
.romantic-memory-images {
  margin-bottom: var(--romantic-spacing-4);
}

.image-gallery {
  display: grid;
  gap: var(--romantic-spacing-2);
  border-radius: var(--romantic-radius);
  overflow: hidden;
}

.single-image {
  grid-template-columns: 1fr;
}

.two-images {
  grid-template-columns: 1fr 1fr;
}

.three-images {
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.multiple-images {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.image-container {
  position: relative;
  overflow: hidden;
  border-radius: var(--romantic-radius-sm);
  background: var(--romantic-gray);
}

.main-image {
  grid-row: 1 / 3;
}

.memory-image {
  width: 100%;
  height: 100%;
  min-height: 200px;
  object-fit: cover;
  transition: var(--romantic-transition);
  cursor: pointer;
}

.single-image .memory-image {
  min-height: 250px;
  max-height: 400px;
}

.two-images .memory-image {
  min-height: 200px;
  max-height: 300px;
}

.three-images .memory-image {
  min-height: 150px;
}

.three-images .main-image .memory-image {
  min-height: 300px;
}

.multiple-images .memory-image {
  min-height: 150px;
  max-height: 200px;
}

.memory-image:hover {
  transform: scale(1.05);
}

/* 图片叠加效果 */
.image-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 107, 157, 0.1) 0%,
    transparent 50%,
    rgba(168, 125, 200, 0.1) 100%
  );
  opacity: 0;
  transition: var(--romantic-transition);
  pointer-events: none;
  z-index: 1;
}

.image-container:hover::before {
  opacity: 1;
}

.romantic-card-actions {
  display: flex;
  gap: var(--romantic-spacing-3);
  padding-top: var(--romantic-spacing-4);
  border-top: 1px solid var(--romantic-gray);
  margin-top: var(--romantic-spacing-4);
}

.romantic-action-button {
  padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
  border: none;
  border-radius: var(--romantic-radius);
  cursor: pointer;
  font-weight: var(--romantic-font-weight-medium);
  transition: var(--romantic-transition);
  font-size: var(--romantic-font-size-sm);
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
  
  .single-image .memory-image {
    min-height: 180px;
    max-height: 250px;
  }
  
  .two-images .memory-image {
    min-height: 120px;
    max-height: 180px;
  }
  
  .three-images .memory-image {
    min-height: 100px;
  }
  
  .three-images .main-image .memory-image {
    min-height: 200px;
  }
  
  .multiple-images .memory-image {
    min-height: 100px;
    max-height: 150px;
  }
  
  .romantic-card-actions {
    gap: 0.5rem;
  }
  
  .romantic-action-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
    border-radius: var(--romantic-radius);
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
  
  .image-gallery {
    gap: var(--romantic-spacing-1);
  }
  
  .single-image .memory-image {
    min-height: 150px;
    max-height: 200px;
  }
  
  .two-images .memory-image {
    min-height: 100px;
    max-height: 150px;
  }
  
  .three-images .memory-image {
    min-height: 80px;
  }
  
  .three-images .main-image .memory-image {
    min-height: 160px;
  }
  
  .multiple-images .memory-image {
    min-height: 80px;
    max-height: 120px;
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