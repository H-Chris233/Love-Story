<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { anniversaryAPI, authAPI } from '../services/api'
import type { Anniversary } from '../types/api'
import AnniversaryForm from '../components/AnniversaryForm.vue'

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
const totalPages = computed(() => {
  // 防御性编程：确保 anniversaries.value 是数组
  if (!Array.isArray(anniversaries.value)) {
    return 0
  }
  return Math.ceil(anniversaries.value.length / anniversariesPerPage)
})

// 获取当前页的纪念日数据
const paginatedAnniversaries = computed(() => {
  // 防御性编程：确保 anniversaries.value 是数组
  if (!Array.isArray(anniversaries.value)) {
    console.warn('⚠️ [ANNIVERSARIES-VIEW] anniversaries.value is not an array:', anniversaries.value)
    return []
  }
  
  const startIndex = (currentPage.value - 1) * anniversariesPerPage
  const endIndex = startIndex + anniversariesPerPage
  return anniversaries.value.slice(startIndex, endIndex)
})

// 获取纪念日数据
const fetchAnniversaries = async () => {
  try {
    console.log('🎯 [DEBUG] Starting fetchAnniversaries, loading:', loading.value)
    loading.value = true
    console.log('🎯 [DEBUG] Calling anniversaryAPI.getAll()...')
    const response = await anniversaryAPI.getAll()
    console.log('🎯 [DEBUG] API response received, data:', response.data)
    anniversaries.value = response.data
    console.log('🎯 [DEBUG] anniversaries.value set to:', anniversaries.value)
    // 重置到第一页
    currentPage.value = 1
  } catch (err) {
    console.error('获取纪念日数据失败:', err)
    error.value = '获取纪念日数据失败'
  } finally {
    loading.value = false
    console.log('🎯 [DEBUG] fetchAnniversaries completed, loading:', loading.value, 'error:', error.value)
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
  // 获取今天的日期，标准化为当地时间的午夜
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // 解析纪念日日期
  const inputDate = new Date(dateString)
  
  // 创建今年的纪念日日期，使用输入日期的月份和日期
  const thisYearAnniversary = new Date(today.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 0, 0, 0, 0)
  
  // 计算与今天的差值
  let diffTime = thisYearAnniversary.getTime() - today.getTime()
  let daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  // 如果今年的纪念日已经过了，计算到明年的天数
  if (daysLeft < 0) {
    const nextYearAnniversary = new Date(today.getFullYear() + 1, inputDate.getMonth(), inputDate.getDate(), 0, 0, 0, 0)
    diffTime = nextYearAnniversary.getTime() - today.getTime()
    daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24))
  }
  
  // 开发环境下的调试信息
  if (import.meta.env.DEV) {
    console.log(`📅 [DATE-DEBUG] 输入日期: ${dateString}`)
    console.log(`📅 [DATE-DEBUG] 今天: ${today.toISOString().split('T')[0]}`)
    console.log(`📅 [DATE-DEBUG] 今年纪念日: ${thisYearAnniversary.toISOString().split('T')[0]}`)
    console.log(`📅 [DATE-DEBUG] 剩余天数: ${daysLeft}`)
  }
  
  return daysLeft
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
  console.log('🎯 [DEBUG] handleAddAnniversary called, current showForm:', showForm.value)
  editingAnniversary.value = null
  showForm.value = true
  console.log('🎯 [DEBUG] showForm set to:', showForm.value)
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

// 获取纪念日图标
const getAnniversaryIcon = (dateString: string): string => {
  const daysLeft = daysUntil(dateString)
  if (daysLeft === 0) return '🎉'
  if (daysLeft <= 3) return '⭐'
  if (daysLeft <= 7) return '💖'
  if (daysLeft <= 30) return '💕'
  return '📅'
}

// 获取卡片装饰条样式
const getCardDecorationClass = (dateString: string): string => {
  const daysLeft = daysUntil(dateString)
  if (daysLeft === 0) return 'decoration-today'
  if (daysLeft <= 7) return 'decoration-soon'
  if (daysLeft <= 30) return 'decoration-upcoming'
  return 'decoration-future'
}

// 获取倒计时样式
const getCountdownClass = (dateString: string): string => {
  const daysLeft = daysUntil(dateString)
  if (daysLeft === 0) return 'badge-today'
  if (daysLeft <= 7) return 'badge-soon'
  if (daysLeft <= 30) return 'badge-upcoming'
  return 'badge-future'
}

// 获取倒计时文本
const getCountdownText = (dateString: string): string => {
  const daysLeft = daysUntil(dateString)
  
  if (daysLeft === 0) return '🎊 就是今天！'
  if (daysLeft === 1) return '⏰ 明天到来'
  if (daysLeft <= 7) return `⭐ 还有 ${daysLeft} 天`
  if (daysLeft <= 30) return `⏳ 还有 ${daysLeft} 天`
  return `📆 还有 ${daysLeft} 天`
}

// 处理分页
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// 检查是否为开发/测试环境
const isDevelopment = computed(() => {
  return import.meta.env.DEV || 
         import.meta.env.MODE === 'development' || 
         import.meta.env.MODE === 'test' ||
         import.meta.env.VITE_ENABLE_TEST_FEATURES === 'true'
})

// 检查用户是否为管理员（可选的额外权限检查）
const isAdmin = computed(() => {
  // 可以根据实际需求修改管理员判断逻辑
  const adminEmails = ['admin@example.com', 'developer@example.com']
  return user.value?.email && adminEmails.includes(user.value.email)
})

// 是否显示测试按钮
const showTestButton = computed(() => {
  // 优先检查环境变量，然后检查开发模式，最后检查管理员权限
  return isDevelopment.value || isAdmin.value
})

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
        <div v-if="paginatedAnniversaries.length === 0" class="empty-state">
          <div class="empty-icon">📅</div>
          <h3 class="empty-title">还没有纪念日</h3>
          <p class="empty-description">点击下方按钮添加第一个纪念日</p>
        </div>
        
        <div v-else class="anniversaries-grid">
          <div 
            v-for="(anniversary, index) in paginatedAnniversaries" 
            :key="anniversary._id" 
            :class="['anniversary-card', `anniversary-card-delay-${index % 10}`]"
          >
            <!-- 卡片顶部装饰条 -->
            <div class="card-decoration" :class="getCardDecorationClass(anniversary.date)"></div>
            
            <!-- 卡片主体内容 -->
            <div class="card-content">
              <!-- 标题和操作按钮 -->
              <div class="card-header">
                <div class="anniversary-icon">{{ getAnniversaryIcon(anniversary.date) }}</div>
                <h3 class="card-title">{{ anniversary.title }}</h3>
                <div class="card-actions">
                  <button 
                    @click="handleEditAnniversary(anniversary)" 
                    class="action-btn edit-btn"
                    title="编辑纪念日"
                  >
                    ✏️
                  </button>
                  <button 
                    @click="handleDeleteAnniversary(anniversary._id)" 
                    class="action-btn delete-btn"
                    title="删除纪念日"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <!-- 日期信息 -->
              <div class="card-info">
                <div class="date-info">
                  <div class="date-label">纪念日期</div>
                  <div class="date-value">{{ formatDate(anniversary.date) }}</div>
                </div>
                
                <div class="reminder-info">
                  <div class="reminder-label">提前提醒</div>
                  <div class="reminder-value">{{ anniversary.reminderDays }} 天</div>
                </div>
              </div>

              <!-- 倒计时显示 -->
              <div class="countdown-info">
                <div class="countdown-badge" :class="getCountdownClass(anniversary.date)">
                  {{ getCountdownText(anniversary.date) }}
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="card-bottom" v-if="showTestButton">
                <button 
                  @click="handleSendReminder(anniversary._id)"
                  class="send-reminder-btn"
                  :disabled="loading"
                >
                  <span class="btn-icon">📧</span>
                  <span class="btn-text">测试发送提醒</span>
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
        <div class="action-buttons">
          <button 
            @click="handleAddAnniversary"
            class="romantic-button romantic-button-lg"
          >
            添加新的纪念日
          </button>
          
          <!-- 测试环境下的全局测试按钮 -->
          <button 
            v-if="showTestButton"
            @click="handleTestSendReminders"
            class="romantic-button romantic-button-secondary romantic-button-lg"
            :disabled="loading"
          >
            🧪 测试发送所有提醒
          </button>
        </div>
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
  max-width: 1200px;
  margin: 0 auto;
}

.anniversaries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--romantic-spacing-6);
  margin-bottom: var(--romantic-spacing-8);
}

.anniversary-card {
  position: relative;
  background: var(--romantic-white);
  border-radius: var(--romantic-radius-lg);
  box-shadow: var(--romantic-shadow);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 107, 157, 0.1);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: romanticFadeInUp 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
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
  transform: translateY(-8px);
  box-shadow: var(--romantic-shadow-hover);
}

/* 卡片装饰条 */
.card-decoration {
  height: 4px;
  width: 100%;
  background: linear-gradient(90deg, var(--romantic-primary), var(--romantic-secondary));
  position: absolute;
  top: 0;
  left: 0;
}

.decoration-today {
  background: linear-gradient(90deg, #10b981, #059669);
  animation: romanticPulse 2s ease-in-out infinite;
}

.decoration-soon {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.decoration-upcoming {
  background: linear-gradient(90deg, var(--romantic-primary), var(--romantic-secondary));
}

.decoration-future {
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
}

/* 卡片内容 */
.card-content {
  padding: var(--romantic-spacing-6);
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--romantic-spacing-3);
  margin-bottom: var(--romantic-spacing-4);
}

.anniversary-icon {
  font-size: 1.8rem;
  line-height: 1;
  flex-shrink: 0;
}

.card-title {
  font-size: var(--romantic-font-size-lg);
  font-weight: var(--romantic-font-weight-bold);
  color: var(--romantic-dark);
  margin: 0;
  line-height: var(--romantic-line-height-tight);
  flex: 1;
  min-width: 0; /* 允许文字截断 */
}

.card-actions {
  display: flex;
  gap: var(--romantic-spacing-1);
  flex-shrink: 0;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--romantic-radius);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--romantic-light);
  backdrop-filter: blur(8px);
  border: 1px solid var(--romantic-gray);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--romantic-dark-medium);
}

.edit-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  transform: scale(1.1);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  transform: scale(1.1);
}



/* 卡片信息区域 */
.card-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--romantic-spacing-4);
  margin-bottom: var(--romantic-spacing-5);
}

.date-info, .reminder-info {
  background: var(--romantic-light);
  border-radius: var(--romantic-radius);
  padding: var(--romantic-spacing-3);
  border-left: 4px solid var(--romantic-primary);
  backdrop-filter: blur(8px);
  border: 1px solid var(--romantic-gray);
}

.date-label, .reminder-label {
  font-size: var(--romantic-font-size-xs);
  font-weight: var(--romantic-font-weight-medium);
  color: var(--romantic-dark-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--romantic-spacing-1);
}

.date-value, .reminder-value {
  font-size: var(--romantic-font-size-sm);
  font-weight: var(--romantic-font-weight-semibold);
  color: var(--romantic-dark);
  line-height: var(--romantic-line-height-tight);
}

/* 倒计时区域 */
.countdown-info {
  display: flex;
  justify-content: center;
  margin-bottom: var(--romantic-spacing-5);
}

.countdown-badge {
  padding: var(--romantic-spacing-3) var(--romantic-spacing-5);
  border-radius: var(--romantic-radius-lg);
  font-size: var(--romantic-font-size-sm);
  font-weight: var(--romantic-font-weight-bold);
  text-align: center;
  box-shadow: var(--romantic-shadow);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.badge-today {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  animation: romanticPulse 2s ease-in-out infinite;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.badge-soon {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
}

.badge-upcoming {
  background: linear-gradient(135deg, var(--romantic-primary), var(--romantic-secondary));
  color: white;
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.3);
}

.badge-future {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.badge-past {
  background: linear-gradient(135deg, #64748b, #475569);
  color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(100, 116, 139, 0.2);
}

/* 卡片底部操作区域 */
.card-bottom {
  display: flex;
  justify-content: center;
}

.send-reminder-btn {
  display: flex;
  align-items: center;
  gap: var(--romantic-spacing-2);
  padding: var(--romantic-spacing-3) var(--romantic-spacing-5);
  background: linear-gradient(135deg, var(--romantic-primary), var(--romantic-secondary));
  color: white;
  border: none;
  border-radius: var(--romantic-radius-lg);
  font-size: var(--romantic-font-size-sm);
  font-weight: var(--romantic-font-weight-medium);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.2);
  position: relative;
  overflow: hidden;
}

.send-reminder-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 107, 157, 0.3);
}

.send-reminder-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1.1rem;
}

.btn-text {
  font-weight: var(--romantic-font-weight-medium);
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--romantic-spacing-4);
  align-items: center;
  justify-content: center;
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
  
  .card-info {
    grid-template-columns: 1fr;
    gap: var(--romantic-spacing-3);
  }
  
  .card-header {
    flex-wrap: wrap;
    gap: var(--romantic-spacing-2);
  }
  
  .card-title {
    font-size: var(--romantic-font-size-base);
  }
  
  .anniversary-icon {
    font-size: 1.5rem;
  }
  
  .card-title {
    font-size: var(--romantic-font-size-lg);
  }
}

@media (max-width: 480px) {
  .romantic-home {
    padding: var(--romantic-spacing-3);
  }
  
  .anniversaries-grid {
    grid-template-columns: 1fr;
    gap: var(--romantic-spacing-3);
  }
  
  .card-content {
    padding: var(--romantic-spacing-4);
  }
  
  .anniversary-icon {
    font-size: 1.2rem;
  }
  
  .card-title {
    font-size: var(--romantic-font-size-sm);
  }
  
  .action-btn {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .countdown-badge {
    padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
    font-size: var(--romantic-font-size-xs);
  }
  
  .send-reminder-btn {
    padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
    font-size: var(--romantic-font-size-xs);
  }
  
  .action-buttons {
    flex-direction: column;
    gap: var(--romantic-spacing-3);
  }
  
  .empty-state {
    padding: var(--romantic-spacing-8);
  }
  
  .empty-icon {
    font-size: 3rem;
  }
}

/* 动画增强 */
@keyframes romanticFadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes romanticPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.6);
  }
}

@keyframes romanticGlow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(255, 107, 157, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 107, 157, 0.6);
  }
}

/* 卡片进入动画延迟 */
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
</style>