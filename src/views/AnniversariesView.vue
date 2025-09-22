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
  <div class="anniversaries-page">
    <header class="page-header">
      <h1 class="text-3xl font-bold text-center mb-8">重要纪念日</h1>
      <p class="text-center text-gray-600 mb-10">记录我们的重要日子，不再错过任何美好时刻</p>
    </header>

    <div v-if="loading" class="text-center py-10">
      <div class="loading-spinner"></div>
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
      <div class="anniversaries-list">
        <div 
          v-for="anniversary in anniversaries" 
          :key="anniversary._id" 
          class="anniversary-card"
        >
          <div class="card-header">
            <h2 class="anniversary-title">{{ anniversary.title }}</h2>
            <div class="card-actions">
              <button 
                @click="handleEditAnniversary(anniversary)"
                class="action-button edit-button"
                title="编辑"
              >
                编辑
              </button>
              <button 
                @click="handleDeleteAnniversary(anniversary._id)"
                class="action-button delete-button"
                title="删除"
              >
                删除
              </button>
            </div>
          </div>
          
          <div class="card-body">
            <p class="anniversary-date">{{ formatDate(anniversary.date) }}</p>
            <p class="days-until" :class="{ 'today': calculateDaysUntil(anniversary.date) === 0, 'past': calculateDaysUntil(anniversary.date) < 0 }">
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

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.edit-button {
  background: #dbeafe; /* blue-100 */
  color: #1d4ed8; /* blue-700 */
  border: 1px solid #93c5fd; /* blue-300 */
}

.edit-button:hover {
  background: #bfdbfe; /* blue-200 */
}

.delete-button {
  background: #fee2e2; /* red-100 */
  color: #b91c1c; /* red-700 */
  border: 1px solid #fca5a5; /* red-300 */
}

.delete-button:hover {
  background: #fecaca; /* red-200 */
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
  
  .action-button {
    padding: 0.2rem 0.4rem;
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
  
  .anniversary-date {
    font-size: 0.9rem;
  }
  
  .days-until {
    font-size: 0.9rem;
  }
}
</style>