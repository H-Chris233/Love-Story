<script setup lang="ts">
import { ref, watch } from 'vue'
import { anniversaryAPI } from '../services/api'
import type { Anniversary } from '../types/api'

// 定义组件属性
interface Props {
  anniversary?: Anniversary | null
}

const props = withDefaults(defineProps<Props>(), {
  anniversary: null
})

// 定义事件
const emit = defineEmits<{
  (e: 'save', anniversary: Anniversary): void
  (e: 'cancel'): void
}>()

// 表单数据
const formData = ref({
  title: '',
  date: '',
  reminderDays: 1
})

const loading = ref(false)
const error = ref('')

// 监听传入的纪念日数据变化
watch(() => props.anniversary, (newAnniversary) => {
  if (newAnniversary) {
    formData.value = {
      title: newAnniversary.title,
      date: newAnniversary.date.split('T')[0], // 只取日期部分
      reminderDays: newAnniversary.reminderDays
    }
  } else {
    formData.value = {
      title: '',
      date: '',
      reminderDays: 1
    }
  }
}, { immediate: true })

// 保存纪念日
const saveAnniversary = async () => {
  try {
    loading.value = true
    error.value = ''

    // 验证表单数据
    if (!formData.value.title || !formData.value.date) {
      error.value = '请填写所有必填字段'
      return
    }

    const anniversaryData = {
      title: formData.value.title,
      date: formData.value.date,
      reminderDays: formData.value.reminderDays
    }

    let response

    if (props.anniversary) {
      // 编辑现有纪念日
      response = await anniversaryAPI.update(props.anniversary._id, anniversaryData)
    } else {
      // 创建新纪念日
      response = await anniversaryAPI.create(anniversaryData)
    }

    emit('save', response.data)
  } catch (err) {
    console.error('保存纪念日失败:', err)
    error.value = '保存纪念日失败，请重试'
  } finally {
    loading.value = false
  }
}

// 取消表单
const cancelForm = () => {
  emit('cancel')
}
</script>

<template>
  <div class="anniversary-form-overlay romantic-fade-in">
    <div class="anniversary-form romantic-card">
      <div class="romantic-card-header form-header">
        <div class="header-left">
          
          <h2 class="romantic-card-title">{{ props.anniversary ? '编辑纪念日' : '添加纪念日' }}</h2>
        </div>
        <button 
          @click="cancelForm"
          class="close-button"
          title="关闭"
        >
          ✕
        </button>
      </div>

      <div v-if="error" class="error-alert">
        <span class="error-icon">⚠️</span>
        {{ error }}
      </div>

      <form @submit.prevent="saveAnniversary" class="romantic-card-body">
        <div class="romantic-form-group">
          <label for="title" class="romantic-form-label">
            纪念日标题
            <span class="required">*</span>
          </label>
          <input
            id="title"
            v-model="formData.title"
            type="text"
            class="romantic-form-input"
            placeholder="例如：初次相遇、确定关系、第一次约会..."
            required
          >
        </div>

        <div class="romantic-form-group">
          <label for="date" class="romantic-form-label">
            日期
            <span class="required">*</span>
          </label>
          <input
            id="date"
            v-model="formData.date"
            type="date"
            class="romantic-form-input"
            required
          >
        </div>

        <div class="romantic-form-group">
          <label for="reminderDays" class="romantic-form-label">
            
            提前提醒天数
            <span class="help-text">选择提前几天收到提醒</span>
          </label>
          <select
            id="reminderDays"
            v-model.number="formData.reminderDays"
            class="romantic-form-select"
          >
            <option :value="0">当天提醒</option>
            <option :value="1">提前1天</option>
            <option :value="3">提前3天</option>
            <option :value="7">提前7天</option>
            <option :value="15">提前15天</option>
            <option :value="30">提前30天</option>
          </select>
        </div>

        <div class="form-actions">
          <button
            type="button"
            @click="cancelForm"
            class="romantic-button romantic-button-outline"
            :disabled="loading"
          >
            取消
          </button>
          <button
            type="submit"
            class="romantic-button romantic-ripple"
            :disabled="loading"
          >
            <span v-if="loading" class="button-loading">
              <div class="romantic-spinner small"></div>
              保存中...
            </span>
            <span v-else>
              
              保存
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.anniversary-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--romantic-spacing-8);
  overflow: hidden;
}

.anniversary-form {
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--romantic-white);
  border: 1px solid rgba(255, 107, 157, 0.2);
  -webkit-overflow-scrolling: touch;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--romantic-spacing-3);
}



.close-button {
  background: rgba(255, 107, 157, 0.1);
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--romantic-primary);
  padding: var(--romantic-spacing-2);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--romantic-radius-full);
  transition: var(--romantic-transition);
}

.close-button:hover {
  background: rgba(255, 107, 157, 0.2);
  transform: scale(1.1);
}

.error-alert {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: var(--romantic-danger);
  padding: var(--romantic-spacing-4);
  border-radius: var(--romantic-radius);
  margin: var(--romantic-spacing-4);
  display: flex;
  align-items: center;
  gap: var(--romantic-spacing-2);
  border-left: 4px solid var(--romantic-danger);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);
}

.error-icon {
  font-size: 1.2rem;
}

.romantic-form-group {
  margin-bottom: var(--romantic-spacing-4);
}

.romantic-form-label {
  display: flex;
  align-items: center;
  gap: var(--romantic-spacing-2);
  margin-bottom: var(--romantic-spacing-3);
  font-weight: var(--romantic-font-weight-semibold);
  color: var(--romantic-dark);
}



.required {
  color: var(--romantic-danger);
  font-weight: var(--romantic-font-weight-bold);
  margin-left: var(--romantic-spacing-1);
}

.help-text {
  font-size: var(--romantic-font-size-sm);
  color: var(--romantic-dark-medium);
  font-weight: var(--romantic-font-weight-normal);
  margin-left: var(--romantic-spacing-2);
}

.romantic-form-input,
.romantic-form-select {
  width: 100%;
  padding: var(--romantic-spacing-3);
  border: 1px solid var(--romantic-gray);
  border-radius: var(--romantic-radius-sm);
  font-size: var(--romantic-font-size-sm);
  transition: var(--romantic-transition);
  background: var(--romantic-light);
  color: var(--romantic-dark);
}

.romantic-form-input:focus,
.romantic-form-select:focus {
  outline: none;
  border-color: var(--romantic-primary);
  background: var(--romantic-white);
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
  transform: translateY(-1px);
}

.romantic-form-input::placeholder {
  color: var(--romantic-dark-medium);
  opacity: 0.7;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--romantic-spacing-4);
  padding-top: var(--romantic-spacing-6);
  border-top: 1px solid rgba(255, 107, 157, 0.1);
}

.button-loading {
  display: flex;
  align-items: center;
  gap: var(--romantic-spacing-2);
}

.romantic-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
}



/* 动画效果 */
.anniversary-form {
  animation: romanticFadeInUp 0.4s ease-out;
}

@keyframes romanticFadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .anniversary-form-overlay {
    padding: var(--romantic-spacing-6);
  }
  
  .anniversary-form {
    max-height: calc(100vh - 1rem);
  }
  
  .header-left {
    gap: var(--romantic-spacing-2);
  }
  
  .form-icon {
    width: 32px;
    height: 32px;
    font-size: 1.2rem;
  }
  
  .close-button {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .romantic-form-group {
    margin-bottom: var(--romantic-spacing-4);
  }
  
  .romantic-form-label {
    font-size: var(--romantic-font-size-sm);
  }
  
  .romantic-form-input,
  .romantic-form-select {
    padding: var(--romantic-spacing-3);
    font-size: var(--romantic-font-size-sm);
  }
  
  .form-actions {
    gap: var(--romantic-spacing-2);
    flex-direction: column-reverse;
  }
  
  .romantic-button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .anniversary-form-overlay {
    padding: var(--romantic-spacing-4);
  }
  
  .romantic-form-label {
    flex-direction: row;
    align-items: center;
    gap: var(--romantic-spacing-1);
    margin-bottom: var(--romantic-spacing-2);
  }
  
  .required {
    margin-left: var(--romantic-spacing-1);
  }
  
  .help-text {
    margin-left: 0;
    font-size: var(--romantic-font-size-xs);
  }
  
  .romantic-form-input,
  .romantic-form-select {
    padding: var(--romantic-spacing-2);
  }
}

/* 表单验证状态 */
.romantic-form-input:invalid:not(:focus) {
  border-color: var(--romantic-danger);
  background: rgba(239, 68, 68, 0.05);
}

.romantic-form-input:valid {
  border-color: var(--romantic-success);
}

/* 加载状态 */
.romantic-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none !important;
}
</style>