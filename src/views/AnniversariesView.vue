<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AnniversaryForm from '../components/AnniversaryForm.vue'
import { anniversaryAPI } from '../services/api'
import type { Anniversary } from '../types/api'

// 纪念日数据
const anniversaries = ref<Anniversary[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingAnniversary = ref<Anniversary | null>(null)

// 获取纪念日数据
const fetchAnniversaries = async () => {
  try {
    loading.value = true
    const response = await anniversaryAPI.getAll()
    anniversaries.value = response.data
  } catch (err) {
    console.error('获取纪念日数据失败:', err)
    error.value = '获取纪念日数据失败'
  } finally {
    loading.value = false
  }
}

// 处理添加纪念日
const handleAddAnniversary = () => {
  editingAnniversary.value = null
  showForm.value = true
}

// 处理编辑纪念日
const handleEditAnniversary = (anniversary: Anniversary) => {
  editingAnniversary.value = anniversary
  showForm.value = true
}

// 处理保存纪念日（添加或编辑）
const handleSaveAnniversary = (anniversary: Anniversary) => {
  showForm.value = false
  editingAnniversary.value = null
  fetchAnniversaries()
}

// 处理删除纪念日
const handleDeleteAnniversary = async (id: string) => {
  if (confirm('确定要删除这个纪念日吗？')) {
    try {
      await anniversaryAPI.delete(id)
      // 从本地状态中移除已删除的纪念日
      anniversaries.value = anniversaries.value.filter(anniversary => anniversary._id !== id)
    } catch (err) {
      console.error('删除纪念日失败:', err)
      error.value = '删除纪念日失败'
    }
  }
}

// 处理取消表单
const handleCancelForm = () => {
  showForm.value = false
  editingAnniversary.value = null
}

// 计算距离纪念日的天数
const calculateDaysUntil = (dateString: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const anniversaryDate = new Date(dateString)
  anniversaryDate.setHours(0, 0, 0, 0)
  
  const diffTime = anniversaryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

// 页面加载时获取数据
onMounted(() => {
  fetchAnniversaries()
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
  <div class="p-8 max-w-800px mx-auto md:p-8">
    <header class="mb-8 md:mb-8">
      <h1 class="text-2xl font-bold text-center mb-4 md:text-3xl md:mb-8">重要纪念日</h1>
      <p class="text-center text-gray-600 mb-6 md:mb-10 md:text-lg">记录我们的重要日子，不再错过任何美好时刻</p>
    </header>

    <div v-if="loading" class="text-center py-10">
      <div class="border-4 border-gray-200 border-t-4 border-t-pink-500 rounded-50% w-10 h-10 animate-spin mx-auto"></div>
      <p class="mt-2">加载中...</p>
    </div>

    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-500">{{ error }}</p>
      <button 
        @click="fetchAnniversaries" 
        class="mt-4 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
      >
        重新加载
      </button>
    </div>

    <div v-else>
      <div class="flex flex-col gap-6">
        <div 
          v-for="anniversary in anniversaries" 
          :key="anniversary._id" 
          class="bg-white rounded-12px shadow-md p-6 transition-all duration-300 hover:translate-y--3px hover:shadow-lg"
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-1.5rem font-700 text-gray-800 md:text-1.5rem">{{ anniversary.title }}</h2>
            <div class="flex gap-2">
              <button 
                @click="handleEditAnniversary(anniversary)"
                class="p-1 text-0.875rem cursor-pointer transition bg-blue-100 text-blue-700 border-1 border-blue-300 rounded hover:bg-blue-200 md:p-1 md:text-0.875rem"
                title="编辑"
              >
                编辑
              </button>
              <button 
                @click="handleDeleteAnniversary(anniversary._id)"
                class="p-1 text-0.875rem cursor-pointer transition bg-red-100 text-red-700 border-1 border-red-300 rounded hover:bg-red-200 md:p-1 md:text-0.875rem"
                title="删除"
              >
                删除
              </button>
            </div>
          </div>
          
          <div class="flex justify-between items-center md:flex-row md:items-center">
            <p class="text-1.1rem text-gray-600 md:text-1.1rem">{{ formatDate(anniversary.date) }}</p>
            <p 
              class="text-1.1rem font-600 md:text-1.1rem"
              :class="{
                'text-green-500': calculateDaysUntil(anniversary.date) === 0,
                'text-red-500': calculateDaysUntil(anniversary.date) < 0,
                'text-blue-500': calculateDaysUntil(anniversary.date) > 0
              }"
            >
              {{ getDaysUntilText(calculateDaysUntil(anniversary.date)) }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="anniversaries.length === 0" class="text-center py-10">
        <p class="text-gray-500">暂无纪念日，请添加一个重要的日子</p>
      </div>

      <div class="text-center mt-10">
        <button 
          @click="handleAddAnniversary"
          class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
        >
          添加纪念日
        </button>
      </div>
    </div>

    <!-- 纪念日表单模态框 -->
    <AnniversaryForm 
      v-if="showForm"
      :anniversary="editingAnniversary"
      @save="handleSaveAnniversary"
      @cancel="handleCancelForm"
    />
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
  .md\:flex-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .md\:text-1\.1rem {
    font-size: 1rem;
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
  
  .md\:p-6 {
    padding: 1rem;
  }
  
  .md\:text-1\.5rem {
    font-size: 1.3rem;
  }
  
  .md\:p-1 {
    padding: 0.2rem 0.4rem;
    font-size: 0.8rem;
  }
  
  .mt-10 {
    margin-top: 2rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .md\:p-8 {
    padding: 0.5rem;
  }
  
  .md\:text-3xl {
    font-size: 1.5rem;
  }
  
  .md\:mb-10 {
    font-size: 0.9rem;
  }
  
  .md\:p-6 {
    padding: 0.75rem;
  }
  
  .mb-4 {
    margin-bottom: 0.75rem;
  }
  
  .md\:text-1\.5rem {
    font-size: 1.2rem;
  }
  
  .md\:text-1\.1rem {
    font-size: 0.9rem;
  }
}
</style>