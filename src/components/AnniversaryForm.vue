<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
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
  <div class="anniversary-form-overlay">
    <div class="anniversary-form">
      <div class="form-header">
        <h2 class="form-title">{{ props.anniversary ? '编辑纪念日' : '添加纪念日' }}</h2>
        <button 
          @click="cancelForm"
          class="close-button"
        >
          &times;
        </button>
      </div>

      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <form @submit.prevent="saveAnniversary">
        <div class="form-group">
          <label for="title" class="form-label">纪念日标题 *</label>
          <input
            id="title"
            v-model="formData.title"
            type="text"
            class="form-input"
            placeholder="例如：初次相遇、确定关系等"
            required
          >
        </div>

        <div class="form-group">
          <label for="date" class="form-label">日期 *</label>
          <input
            id="date"
            v-model="formData.date"
            type="date"
            class="form-input"
            required
          >
        </div>

        <div class="form-group">
          <label for="reminderDays" class="form-label">
            提前提醒天数
            <span class="reminder-days-help">(默认1天)</span>
          </label>
          <select
            id="reminderDays"
            v-model.number="formData.reminderDays"
            class="form-input"
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
            class="btn btn-secondary"
            :disabled="loading"
          >
            取消
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading"
          >
            {{ loading ? '保存中...' : '保存' }}
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.anniversary-form {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-title {
  font-size: 1.5rem;
  font-weight: bold;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #9ca3af;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #6b7280;
}

.alert-error {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.75rem;
  border-radius: 6px;
  margin: 1rem;
}

.form-group {
  margin: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.reminder-days-help {
  font-size: 0.875rem;
  color: #6b7280;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #ec4899;
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-primary {
  background: #ec4899;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #db2777;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .anniversary-form {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
  
  .form-header {
    padding: 1rem;
  }
  
  .form-group {
    margin: 0.75rem;
  }
  
  .form-actions {
    padding: 1rem;
    gap: 0.5rem;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}
</style>