<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 定义照片数据类型
interface Photo {
  id: number
  url: string
  title: string
  date: string
}

// 模拟照片数据
const photos = ref<Photo[]>([
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
    title: '海边日出',
    date: '2020-05-01'
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963',
    title: '山间小径',
    date: '2020-06-15'
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
    title: '森林漫步',
    date: '2020-07-20'
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
    title: '湖边黄昏',
    date: '2020-08-10'
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1',
    title: '城市夜景',
    date: '2020-09-05'
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891',
    title: '音乐节',
    date: '2020-10-12'
  }
])

// 页面加载时的处理
onMounted(() => {
  console.log('Photos page loaded')
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

    <div class="text-center mt-10">
      <button class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300">
        上传新照片
      </button>
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