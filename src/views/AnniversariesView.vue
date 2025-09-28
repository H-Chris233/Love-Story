<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { anniversaryAPI, authAPI } from '../services/api'
import type { Anniversary } from '../types/api'

// 纪念日数据
const anniversaries = ref<Anniversary[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingAnniversary = ref<Anniversary | null>(null)
const user = ref<{ name: string; email: string } | null>(null)

// 分页相关
const currentPage = ref(1)
const anniversariesPerPage = 10 // 每页显示10个纪念日
const totalPages = computed(() => Math.ceil(anniversaries.value.length / anniversariesPerPage))

// 获取当前页的纪念日数据
const paginatedAnniversaries = computed(() => {
  const startIndex = (currentPage.value - 1) * anniversariesPerPage
  const endIndex = startIndex + anniversariesPerPage
  return anniversaries.value.slice(startIndex, endIndex)
})

// 获取纪念日数据
const fetchAnniversaries = async () => {
  try {
    loading.value = true
    const response = await anniversaryAPI.getAll()
    anniversaries.value = response.data
    // 重置到第一页
    currentPage.value = 1
  } catch (err) {
    console.error('获取纪念日数据失败:', err)
    error.value = '获取纪念日数据失败'
  } finally {
    loading.value = false
  }
}

// 获取用户信息
const fetchUser = async () => {
  try {
    const response = await authAPI.getProfile()
    user.value = response.data
  } catch (err) {
    console.error('获取用户信息失败:', err)
  }
}

// 计算距离纪念日的天数
const daysUntil = (dateString: string): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const anniversaryDate = new Date(dateString)
  anniversaryDate.setFullYear(today.getFullYear())
  
  // 如果今年的纪念日已经过了，计算到明年的天数
  if (anniversaryDate < today) {
    anniversaryDate.setFullYear(today.getFullYear() + 1)
  }
  
  const diffTime = anniversaryDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// 格式化日期为中文
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[date.getDay()]
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`
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
  try {
    await anniversaryAPI.delete(id)
    // 从本地状态中移除已删除的纪念日
    anniversaries.value = anniversaries.value.filter(anniversary => anniversary._id !== id)
    // 如果当前页没有纪念日了，且不是第一页，则跳转到上一页
    if (paginatedAnniversaries.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }
  } catch (err) {
    console.error('删除纪念日失败:', err)
    error.value = '删除纪念日失败'
  }
}

// 处理发送提醒
const handleSendReminder = async (id: string) => {
  try {
    const response = await anniversaryAPI.sendReminder(id)
    console.log('提醒发送成功:', response.data)
    alert('提醒发送成功！')
  } catch (err) {
    console.error('发送提醒失败:', err)
    alert('发送提醒失败')
  }
}

// 处理测试发送所有提醒
const handleTestSendReminders = async () => {
  try {
    const response = await anniversaryAPI.testSendAllReminders()
    console.log('测试发送所有提醒成功:', response.data)
    alert(`测试发送完成: ${response.data.message}`)
  } catch (err) {
    console.error('测试发送提醒失败:', err)
    alert('测试发送提醒失败')
  }
}

// 处理取消表单
const handleCancelForm = () => {
  showForm.value = false
  editingAnniversary.value = null
}

// 处理分页
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchAnniversaries()
  fetchUser()
})
</script>

<template>
  <div class="romantic-home romantic-fade-in">
    <div class="romantic-container">
      <header class="anniversary-header">
        <div class="header-icon">💕</div>
        <h1 class="romantic-title romantic-title-md">重要纪念日</h1>
        <p class="romantic-subtitle">记录我们的重要日子，不再错过任何美好时刻</p>
      </header>

      <div v-if="loading" class="loading-container">
        <div class="romantic-spinner"></div>
        <p class="loading-text">加载纪念日中...</p>
      </div>

      <div v-else-if="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ error }}</p>
        <button 
          @click="fetchAnniversaries" 
          class="romantic-button romantic-button-sm"
        >
          重新加载
        </button>
      </div>

      <div v-else>
      <div class="anniversary-grid">
        <div 
          v-for="anniversary in paginatedAnniversaries" 
          :key="anniversary._id" 
          class="romantic-card anniversary-card"
        >
          <div class="romantic-card-header">
            <h3 class="romantic-card-title">{{ anniversary.title }}</h3>
            <div class="anniversary-actions">
              <button 
                @click="handleEditAnniversary(anniversary)" 
                class="romantic-button romantic-button-sm romantic-button-outline"
              >
                编辑
              </button>
              <button 
                @click="handleDeleteAnniversary(anniversary._id)" 
                class="romantic-button romantic-button-sm romantic-button-outline romantic-button-danger"
              >
                删除
              </button>
            </div>
          </div>
          
          <div class="romantic-card-body">
            <p><strong>日期:</strong> {{ formatDate(anniversary.date) }}</p>
            <p><strong>提醒天数:</strong> {{ anniversary.reminderDays }} 天</p>
            <p><strong>距离:</strong> 
              <span :class="{
                'days-until-soon': daysUntil(anniversary.date) <= 7,
                'days-until-far': daysUntil(anniversary.date) > 7
              }">
                {{ daysUntil(anniversary.date) }} 天
              </span>
            </p>
            
            <div class="romantic-card-actions romantic-mt-4">
              <button 
                @click="handleSendReminder(anniversary._id)"
                class="romantic-button romantic-button-sm"
              >
                📧 测试发送提醒
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 分页组件 -->
      <div v-if="totalPages > 1" class="romantic-flex romantic-justify-center romantic-mt-8 romantic-gap-2">
        <button 
          @click="goToPage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="romantic-button romantic-button-outline romantic-px-4"
        >
          上一页
        </button>
        
        <span class="romantic-flex romantic-items-center romantic-px-4 romantic-text-gray-600">
          {{ currentPage }} / {{ totalPages }}
        </span>
        
        <button 
          @click="goToPage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="romantic-button romantic-button-outline romantic-px-4"
        >
          下一页
        </button>
      </div>

      <div class="romantic-text-center romantic-mt-10">
        <button 
          @click="handleAddAnniversary"
          class="romantic-button romantic-button-lg"
        >
          添加新的纪念日
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
  </div>
</template>

<style scoped>
.romantic-home {
  min-height: calc(100vh - 70px);
  background: var(--romantic-gradient);
  padding: var(--romantic-spacing-6);
}

.anniversary-header {
  text-align: center;
  margin-bottom: var(--romantic-spacing-10);
}

.header-icon {
  font-size: 3rem;
  margin-bottom: var(--romantic-spacing-4);
  animation: romanticHeartbeat 2s ease-in-out infinite;
}

.loading-container {
  text-align: center;
  padding: var(--romantic-spacing-12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--romantic-spacing-4);
}

.loading-text {
  color: var(--romantic-dark-medium);
  font-size: var(--romantic-font-size-lg);
  margin: 0;
}

.error-container {
  text-align: center;
  padding: var(--romantic-spacing-12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--romantic-spacing-4);
}

.error-icon {
  font-size: 3rem;
  margin-bottom: var(--romantic-spacing-2);
}

.error-message {
  color: var(--romantic-danger);
  font-size: var(--romantic-font-size-lg);
  margin: 0;
}

.anniversaries-content {
  max-width: 1000px;
  margin: 0 auto;
}

.anniversaries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--romantic-spacing-4);
  margin-bottom: var(--romantic-spacing-8);
}

.anniversary-card {
  position: relative;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border-radius: var(--romantic-radius);
  border: 1px solid rgba(71, 85, 105, 0.3);
  overflow: hidden;
  transition: var(--romantic-transition);
  animation: romanticFadeInUp 0.6s ease-out forwards;
}

/* Animation delay classes for staggered effect */
.anniversary-card-delay-0 { animation-delay: 0s; }
.anniversary-card-delay-1 { animation-delay: 0.1s; }
.anniversary-card-delay-2 { animation-delay: 0.2s; }
.anniversary-card-delay-3 { animation-delay: 0.3s; }
.anniversary-card-delay-4 { animation-delay: 0.4s; }
.anniversary-card-delay-5 { animation-delay: 0.5s; }
.anniversary-card-delay-6 { animation-delay: 0.6s; }
.anniversary-card-delay-7 { animation-delay: 0.7s; }
.anniversary-card-delay-8 { animation-delay: 0.8s; }
.anniversary-card-delay-9 { animation-delay: 0.9s; }

.anniversary-card:hover {
  border-color: rgba(255, 107, 157, 0.5);
  box-shadow: 0 4px 20px rgba(255, 107, 157, 0.1);
}

.card-actions {
  position: absolute;
  bottom: var(--romantic-spacing-2);
  right: var(--romantic-spacing-2);
  display: flex;
  gap: var(--romantic-spacing-1);
  z-index: 2;
}

.action-btn {
  padding: var(--romantic-spacing-1) var(--romantic-spacing-2);
  border: none;
  border-radius: var(--romantic-radius-sm);
  font-size: var(--romantic-font-size-xs);
  font-weight: var(--romantic-font-weight-medium);
  cursor: pointer;
  transition: var(--romantic-transition);
  opacity: 0.8;
}

.edit-btn {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.edit-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  opacity: 1;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  opacity: 1;
}



.card-content {
  padding: var(--romantic-spacing-4);
  text-align: center;
}

.card-title {
  font-size: var(--romantic-font-size-lg);
  font-weight: var(--romantic-font-weight-bold);
  color: #f1f5f9;
  margin: 0 0 var(--romantic-spacing-4) 0;
  line-height: var(--romantic-line-height-tight);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: var(--romantic-spacing-3);
}

.date-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--romantic-spacing-2) var(--romantic-spacing-3);
  background: rgba(51, 65, 85, 0.4);
  border-radius: var(--romantic-radius-sm);
  border-left: 3px solid var(--romantic-primary);
}

.date-label {
  font-size: var(--romantic-font-size-xs);
  font-weight: var(--romantic-font-weight-medium);
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-value {
  font-size: var(--romantic-font-size-sm);
  font-weight: var(--romantic-font-weight-semibold);
  color: #e2e8f0;
}

.countdown-info {
  display: flex;
  justify-content: center;
}

.countdown-badge {
  padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
  border-radius: var(--romantic-radius);
  font-size: var(--romantic-font-size-sm);
  font-weight: var(--romantic-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-today {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  animation: romanticPulse 2s ease-in-out infinite;
}

.badge-past {
  background: linear-gradient(135deg, #64748b, #475569);
  color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(100, 116, 139, 0.2);
}

.badge-future {
  background: linear-gradient(135deg, var(--romantic-primary), var(--romantic-secondary));
  color: white;
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.3);
}

.empty-state {
  text-align: center;
  padding: var(--romantic-spacing-16);
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--romantic-radius-lg);
  box-shadow: var(--romantic-shadow);
  margin-bottom: var(--romantic-spacing-10);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--romantic-spacing-4);
  opacity: 0.7;
}

.empty-title {
  font-size: var(--romantic-font-size-2xl);
  font-weight: var(--romantic-font-weight-bold);
  color: #2d1b24;
  margin: 0 0 var(--romantic-spacing-2) 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.empty-description {
  font-size: var(--romantic-font-size-lg);
  color: #4a2c3a;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.add-anniversary-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--romantic-spacing-4);
  align-items: center;
}

.add-button {
  position: relative;
  overflow: hidden;
}



.button-icon {
  margin-right: var(--romantic-spacing-2);
  font-size: 1.2rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .romantic-home {
    padding: var(--romantic-spacing-4);
  }
  
  .anniversary-header {
    margin-bottom: var(--romantic-spacing-8);
  }
  
  .header-icon {
    font-size: 2.5rem;
  }
  
  .anniversaries-grid {
    grid-template-columns: 1fr;
    gap: var(--romantic-spacing-4);
  }
  
  .anniversary-card-header {
    flex-wrap: wrap;
    gap: var(--romantic-spacing-2);
  }
  
  .anniversary-title {
    font-size: var(--romantic-font-size-lg);
  }
  
  .anniversary-actions {
    order: 3;
    width: 100%;
    justify-content: flex-end;
    margin-top: var(--romantic-spacing-2);
  }
}

@media (max-width: 480px) {
  .romantic-home {
    padding: var(--romantic-spacing-3);
  }
  
  .anniversary-card-body {
    gap: var(--romantic-spacing-3);
  }
  
  .anniversary-date {
    flex-direction: column;
    text-align: center;
    gap: var(--romantic-spacing-1);
  }
  
  .countdown-text {
    font-size: var(--romantic-font-size-lg);
  }
  
  .empty-state {
    padding: var(--romantic-spacing-8);
  }
  
  .empty-icon {
    font-size: 3rem;
  }
}

/* 动画增强 */
@keyframes romanticGlow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(255, 107, 157, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 107, 157, 0.6);
  }
}

.countdown-today {
  animation: romanticGlow 2s ease-in-out infinite;
}
</style>