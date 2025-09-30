<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { imageAPI, memoryAPI } from '../services/api'
import type { Memory } from '../types/api'

// 定义照片数据类型
interface Photo {
  id: string
  url: string
  title: string
  date: string
}

// 照片数据
const photos = ref<Photo[]>([])
const loading = ref(true)
const error = ref('')

// 从回忆数据中提取照片（fallback方法）
const extractPhotosFromMemories = (memories: Memory[]): Photo[] => {
  const extractedPhotos: Photo[] = []
  
  memories.forEach(memory => {
    if (memory.images && memory.images.length > 0) {
      memory.images.forEach((image, index) => {
        extractedPhotos.push({
          id: `${memory._id}-${index}`,
          url: image.url,
          title: memory.title,
          date: memory.date
        })
      })
    }
  })
  
  return extractedPhotos
}

// 获取照片数据
const fetchPhotos = async () => {
  try {
    loading.value = true
    
    // 首先尝试使用专用的imageAPI
    try {
      const response = await imageAPI.getAll()
      
      // 转换API响应为Photo格式
      photos.value = response.data.map(image => ({
        id: image.id,
        url: image.url,
        title: image.memoryTitle,
        date: image.uploadDate
      }))
      
      console.log('✅ [PHOTOS] Successfully fetched photos using imageAPI')
    } catch (imageAPIError) {
      console.warn('⚠️ [PHOTOS] imageAPI failed, falling back to memoryAPI:', imageAPIError)
      
      // 如果imageAPI失败，回退到从memories中提取图片
      const response = await memoryAPI.getAll()
      photos.value = extractPhotosFromMemories(response.data)
      
      console.log('✅ [PHOTOS] Successfully fetched photos using memoryAPI fallback')
    }
  } catch (err) {
    console.error('❌ [PHOTOS] 获取照片数据失败:', err)
    error.value = '获取照片数据失败'
  } finally {
    loading.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchPhotos()
})

// 获取完整的图片URL
const getFullImageUrl = (imageUrl: string) => {
  // 如果URL已经是完整的URL，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // 在开发环境中，使用Vite代理，直接返回相对路径
  if (import.meta.env.DEV) {
    return imageUrl
  }
  
  // 构建基础API URL
  const isServerless = import.meta.env.VITE_USE_SERVERLESS_FUNCTIONS === 'true'
  const baseUrl = isServerless
    ? import.meta.env.VITE_SERVERLESS_API_URL || 'https://your-vercel-project.vercel.app/api'
    : import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  
  // 如果图片URL是/api/images/格式，需要特殊处理
  if (imageUrl.startsWith('/api/images/')) {
    // 如果基础URL是相对路径（如 /api），我们仍需构造完整URL
    if (baseUrl.startsWith('/')) {
      // 在相对路径模式下，通常意味着在同域环境下运行
      // 如果VITE_USE_SERVERLESS_FUNCTIONS为true，我们使用VITE_SERVERLESS_API_URL
      if (isServerless) {
        const serverlessUrl = import.meta.env.VITE_SERVERLESS_API_URL
        if (serverlessUrl) {
          // 取出域名部分
          const urlObj = new URL(serverlessUrl)
          return `${urlObj.origin}${imageUrl}`
        } else {
          // 默认情况下，对于serverless模式，假设在同域下
          return imageUrl
        }
      } else {
        // 传统架构且是相对路径，返回相对路径让代理处理
        return imageUrl
      }
    }
    // 否则构建完整URL
    return `${baseUrl.replace('/api', '')}${imageUrl}`
  }
  
  // 如果图片URL已经是/api/格式，需要去掉/api并添加到基础URL
  if (imageUrl.startsWith('/api/')) {
    const serverUrl = baseUrl.replace('/api', '')
    return `${serverUrl}${imageUrl}`
  }
  
  // 在生产环境中，构建完整URL
  const serverUrl = baseUrl.replace('/api', '')
  return `${serverUrl}${imageUrl}`
}

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
  <div class="romantic-container romantic-py-8">
    <header class="romantic-my-8">
      <h1 class="romantic-title romantic-fade-in">我们的照片相册</h1>
      <p class="romantic-subtitle romantic-fade-in-up">珍藏我们一起度过的美好时光</p>
    </header>

    <div v-if="loading" class="romantic-text-center romantic-py-10">
      <div class="romantic-spinner"></div>
      <p class="romantic-text romantic-m-2">加载中...</p>
    </div>

    <div v-else-if="error" class="romantic-text-center romantic-py-10">
      <p class="romantic-text-danger">{{ error }}</p>
      <button 
        @click="fetchPhotos" 
        class="romantic-button romantic-mt-4"
      >
        重新加载
      </button>
    </div>

    <div v-else>
      <div class="romantic-grid romantic-grid-cols-1 romantic-grid-sm-cols-2 romantic-grid-md-cols-3 romantic-grid-lg-cols-4">
        <div 
          v-for="photo in photos" 
          :key="photo.id" 
          class="romantic-card photo-card romantic-fade-in"
        >
          <div class="photo-wrapper">
            <img 
              :src="getFullImageUrl(photo.url)" 
              :alt="photo.title" 
              class="photo-image"
            >
            <div class="photo-overlay">
              <div class="photo-info">
                <h3 class="photo-title">{{ photo.title }}</h3>
                <p class="photo-date">{{ formatDate(photo.date) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="photos.length === 0" class="romantic-text-center romantic-py-10">
        <p class="romantic-text romantic-text-secondary">暂无照片，请先添加一些包含照片的回忆</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 照片卡片样式 */
.photo-card {
  overflow: hidden;
  transition: var(--romantic-transition);
  border: 1px solid rgba(255, 107, 157, 0.1);
}

.photo-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--romantic-shadow-lg);
}

.photo-wrapper {
  position: relative;
  overflow: hidden;
}

.photo-image {
  width: 100%;
  height: 240px;
  object-fit: cover;
  display: block;
  transition: var(--romantic-transition);
}

.photo-card:hover .photo-image {
  transform: scale(1.05);
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.1) 50%,
    rgba(0, 0, 0, 0.8) 100%
  );
  display: flex;
  align-items: flex-end;
  padding: var(--romantic-spacing-4);
  opacity: 0;
  transition: var(--romantic-transition);
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}

.photo-info {
  color: var(--romantic-white);
  transform: translateY(var(--romantic-spacing-4));
  transition: var(--romantic-transition);
}

.photo-card:hover .photo-info {
  transform: translateY(0);
}

.photo-title {
  font-size: var(--romantic-font-size-lg);
  font-weight: var(--romantic-font-weight-semibold);
  margin-bottom: var(--romantic-spacing-1);
  line-height: var(--romantic-line-height-tight);
}

.photo-date {
  font-size: var(--romantic-font-size-sm);
  opacity: 0.9;
  line-height: var(--romantic-line-height-normal);
}

/* 添加浪漫主题的动画延迟效果 */
.photo-card:nth-child(1) {
  animation-delay: 0.1s;
}

.photo-card:nth-child(2) {
  animation-delay: 0.2s;
}

.photo-card:nth-child(3) {
  animation-delay: 0.3s;
}

.photo-card:nth-child(4) {
  animation-delay: 0.4s;
}

.photo-card:nth-child(5) {
  animation-delay: 0.5s;
}

.photo-card:nth-child(6) {
  animation-delay: 0.6s;
}

.photo-card:nth-child(7) {
  animation-delay: 0.7s;
}

.photo-card:nth-child(8) {
  animation-delay: 0.8s;
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .photo-image {
    height: 180px;
  }
  
  .photo-title {
    font-size: var(--romantic-font-size-base);
  }
  
  .photo-date {
    font-size: var(--romantic-font-size-xs);
  }
  
  .photo-overlay {
    padding: var(--romantic-spacing-3);
  }
}

@media (max-width: 480px) {
  .photo-image {
    height: 150px;
  }
  
  .photo-title {
    font-size: var(--romantic-font-size-sm);
  }
  
  .photo-date {
    font-size: 0.7rem;
  }
  
  .photo-overlay {
    padding: var(--romantic-spacing-2);
  }
  
  .photo-info {
    transform: translateY(var(--romantic-spacing-2));
  }
}

/* 空状态样式 */
.romantic-py-10 p {
  font-size: var(--romantic-font-size-lg);
  line-height: var(--romantic-line-height-relaxed);
}

/* 加载状态优化 */
.romantic-spinner {
  margin-bottom: var(--romantic-spacing-4);
}
</style>