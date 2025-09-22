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
  <div class="photos-page">
    <header class="page-header">
      <h1 class="text-3xl font-bold text-center mb-8">我们的照片相册</h1>
      <p class="text-center text-gray-600 mb-10">珍藏我们一起度过的美好时光</p>
    </header>

    <div v-if="loading" class="text-center py-10">
      <div class="loading-spinner"></div>
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
      <div class="photo-grid">
        <div 
          v-for="photo in photos" 
          :key="photo.id" 
          class="photo-card"
        >
          <div class="photo-wrapper">
            <img 
              :src="photo.url" 
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
.photos-page {
  padding: 2rem;
  max-width: 1200px;
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

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.photo-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.photo-card:hover {
  transform: translateY(-5px);
}

.photo-wrapper {
  position: relative;
  overflow: hidden;
}

.photo-image {
  width: 100%;
  height: 250px;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;
  padding: 1rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}

.photo-info {
  color: white;
  transform: translateY(10px);
  transition: transform 0.3s ease;
}

.photo-card:hover .photo-info {
  transform: translateY(0);
}

.photo-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.photo-date {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* 加载动画 */
.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #ec4899;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .photo-image {
    height: 150px;
  }
  
  .photos-page {
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
  
  .photo-title {
    font-size: 1rem;
  }
  
  .photo-date {
    font-size: 0.8rem;
  }
  
  .text-center {
    margin-top: 2rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  
  .photo-image {
    height: 120px;
  }
  
  .photos-page {
    padding: 0.5rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .page-header p {
    font-size: 0.9rem;
  }
  
  .photo-overlay {
    padding: 0.75rem;
  }
  
  .photo-title {
    font-size: 0.9rem;
  }
  
  .photo-date {
    font-size: 0.75rem;
  }
}
</style>