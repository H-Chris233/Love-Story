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

      <div v-else class="anniversaries-content">
        <div class="anniversaries-grid" v-if="anniversaries.length > 0">
          <div 
            v-for="(anniversary, index) in anniversaries" 
            :key="anniversary._id" 
            class="anniversary-card"
            :class="`anniversary-card-delay-${Math.min(index, 9)}`"
          >
            <!-- 操作按钮 -->
            <div class="card-actions">
              <button 
                @click="handleEditAnniversary(anniversary)"
                class="action-btn edit-btn"
                title="编辑"
              >
                编辑
              </button>
              <button 
                @click="handleDeleteAnniversary(anniversary._id)"
                class="action-btn delete-btn"
                title="删除"
              >
                删除
              </button>
            </div>
            
            <!-- 卡片内容 -->
            <div class="card-content">
              <h3 class="card-title">{{ anniversary.title }}</h3>
              
              <div class="card-info">
                <div class="date-info">
                  <span class="date-label">日期</span>
                  <span class="date-value">{{ formatDate(anniversary.date) }}</span>
                </div>
                
                <div class="countdown-info">
                  <span 
                    class="countdown-badge"
                    :class="{
                      'badge-today': calculateDaysUntil(anniversary.date) === 0,
                      'badge-past': calculateDaysUntil(anniversary.date) < 0,
                      'badge-future': calculateDaysUntil(anniversary.date) > 0
                    }"
                  >
                    {{ getDaysUntilText(calculateDaysUntil(anniversary.date)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">💝</div>
          <h3 class="empty-title">还没有纪念日</h3>
          <p class="empty-description">添加一个对你们来说特别的日子吧</p>
        </div>

        <div class="add-anniversary-section">
          <button 
            @click="handleAddAnniversary"
            class="romantic-button romantic-button-lg romantic-ripple add-button"
          >
            <span class="button-icon">➕</span>
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