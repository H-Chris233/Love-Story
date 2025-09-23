<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { memoryAPI } from '../services/api'
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

// 从回忆数据中提取照片
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
    const response = await memoryAPI.getAll()
    photos.value = extractPhotosFromMemories(response.data)
  } catch (err) {
    console.error('获取照片数据失败:', err)
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
  
  // 在生产环境中，构建完整URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
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
  <div class="p-8 max-w-1200px mx-auto md:p-8">
    <header class="mb-8 md:mb-8">
      <h1 class="text-2xl font-bold text-center mb-4 md:text-3xl md:mb-8">我们的照片相册</h1>
      <p class="text-center text-gray-600 mb-6 md:mb-10 md:text-lg">珍藏我们一起度过的美好时光</p>
    </header>

    <div v-if="loading" class="text-center py-10">
      <div class="border-4 border-gray-200 border-t-4 border-t-pink-500 rounded-50% w-10 h-10 animate-spin mx-auto"></div>
      <p class="mt-2">加载中...</p>
    </div>

    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-500">{{ error }}</p>
      <button 
        @click="fetchPhotos" 
        class="mt-4 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
      >
        重新加载
      </button>
    </div>

    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div 
          v-for="photo in photos" 
          :key="photo.id" 
          class="rounded-12px overflow-hidden shadow-md transition-transform duration-300 hover:translate-y--5"
        >
          <div class="relative overflow-hidden">
            <img 
              :src="getFullImageUrl(photo.url)" 
              :alt="photo.title" 
              class="w-full h-60 object-cover block transition-transform duration-300 hover:scale-105 md:h-60"
            >
            <div class="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 flex items-end p-4 opacity-0 transition-opacity duration-300 hover:opacity-100">
              <div class="text-white transform translate-y-10 transition-transform duration-300 hover:translate-y-0">
                <h3 class="text-1.1rem font-600 mb-1 md:text-1.1rem">{{ photo.title }}</h3>
                <p class="text-0.9rem opacity-80 md:text-0.9rem">{{ formatDate(photo.date) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="photos.length === 0" class="text-center py-10">
        <p class="text-gray-500">暂无照片，请先添加一些包含照片的回忆</p>
      </div>

      <div class="text-center mt-10">
        <button class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300">
          上传新照片
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 加载动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .md\:grid-cols-4 {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .md\:h-60 {
    height: 150px;
  }
  
  .md\:p-8 {
    padding: 1rem;
  }
  
  .md\:mb-8 {
    margin-bottom: 1rem;
  }
  
  .md\:text-3xl {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
  }
  
  .md\:mb-10 {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  
  .md\:text-1\.1rem {
    font-size: 1rem;
  }
  
  .md\:text-0\.9rem {
    font-size: 0.8rem;
  }
  
  .mt-10 {
    margin-top: 2rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .md\:grid-cols-4 {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  
  .md\:h-60 {
    height: 120px;
  }
  
  .md\:p-8 {
    padding: 0.5rem;
  }
  
  .md\:text-3xl {
    font-size: 1.5rem;
  }
  
  .md\:mb-10 {
    font-size: 0.9rem;
  }
  
  .p-4 {
    padding: 0.75rem;
  }
  
  .md\:text-1\.1rem {
    font-size: 0.9rem;
  }
  
  .md\:text-0\.9rem {
    font-size: 0.75rem;
  }
}
</style>