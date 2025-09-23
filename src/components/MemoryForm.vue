<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Memory } from '../types/api'
import { memoryAPI } from '../services/api'

// 定义组件Props
interface Props {
  memory?: Memory | null
  onSave: (memory: Memory) => void
  onCancel: () => void
}

const props = withDefaults(defineProps<Props>(), {
  memory: null
})

const emit = defineEmits<{
  (e: 'save', memory: Memory): void
  (e: 'cancel'): void
}>()

// 定义表单数据
const title = ref('')
const date = ref('')
const description = ref('')
const images = ref<File[]>([])
const imagePreviews = ref<string[]>([])
const existingImages = ref<{url: string, publicId: string}[]>([]) // 用于存储已存在的图片信息
const imagesToDelete = ref<string[]>([]) // 用于跟踪要删除的图片publicId
const isSubmitting = ref(false)
const error = ref('')

// 如果是编辑模式，初始化表单数据
onMounted(() => {
  if (props.memory) {
    title.value = props.memory.title
    date.value = new Date(props.memory.date).toISOString().split('T')[0]
    description.value = props.memory.description
    // 在编辑模式下显示已有的图片
    if (props.memory.images) {
      existingImages.value = [...props.memory.images]
      imagePreviews.value = props.memory.images.map(img => img.url)
    }
  }
})

// 处理图片选择
const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    images.value = [...images.value, ...files] // 添加到现有文件列表中
    
    // 生成新图片预览（追加到现有预览后面）
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          imagePreviews.value.push(e.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    })
  }
}

// 移除图片预览
const removeImage = (index: number) => {
  // 检查是否是已存在的图片（编辑模式下）
  if (props.memory && props.memory.images && index < existingImages.value.length) {
    // 这是已存在的图片，标记为删除
    const imageToDelete = existingImages.value[index]
    imagesToDelete.value.push(imageToDelete.publicId)
    imagePreviews.value.splice(index, 1)
    existingImages.value.splice(index, 1)
  } else {
    // 这是新添加的图片
    const newIndex = props.memory && props.memory.images ? index - (props.memory.images.length - imagesToDelete.value.length) : index
    if (newIndex >= 0 && newIndex < images.value.length) {
      imagePreviews.value.splice(index, 1)
      images.value.splice(newIndex, 1)
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!title.value || !date.value || !description.value) {
    error.value = '请填写所有必填字段'
    return
  }

  isSubmitting.value = true
  error.value = ''

  try {
    // Check if we have images to upload or images to delete
    if (images.value.length > 0 || imagesToDelete.value.length > 0) {
      // Use FormData for file uploads
      const formData = new FormData()
      formData.append('title', title.value)
      formData.append('date', date.value)
      formData.append('description', description.value)
      
      // Add new images
      images.value.forEach(image => {
        formData.append('images', image)
      })
      
      // Add images to delete
      if (imagesToDelete.value.length > 0) {
        formData.append('imagesToDelete', JSON.stringify(imagesToDelete.value))
      }

      if (props.memory) {
        // 编辑模式
        const response = await memoryAPI.updateWithImages(props.memory._id, formData)
        emit('save', response.data)
      } else {
        // 添加模式
        const response = await memoryAPI.createWithImages(formData)
        emit('save', response.data)
      }
    } else {
      // No file uploads needed, use regular JSON
      const memoryData = {
        title: title.value,
        date: date.value,
        description: description.value
      }

      if (props.memory) {
        // 编辑模式
        const response = await memoryAPI.update(props.memory._id, memoryData)
        emit('save', response.data)
      } else {
        // 添加模式
        const response = await memoryAPI.create(memoryData)
        emit('save', response.data)
      }
    }
  } catch (err) {
    console.error('保存记忆时出错:', err)
    error.value = '保存记忆时出错，请重试'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="memory-form-overlay" @click="emit('cancel')">
    <div class="memory-form" @click.stop>
      <div class="form-header">
        <h2 class="form-title">{{ memory ? '编辑回忆' : '添加回忆' }}</h2>
        <button class="close-button" @click="emit('cancel')">×</button>
      </div>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="title">标题 *</label>
          <input 
            id="title" 
            v-model="title" 
            type="text" 
            class="form-input" 
            placeholder="请输入回忆标题"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="date">日期 *</label>
          <input 
            id="date" 
            v-model="date" 
            type="date" 
            class="form-input" 
            required
          >
        </div>
        
        <div class="form-group">
          <label for="description">内容 *</label>
          <textarea 
            id="description" 
            v-model="description" 
            class="form-textarea" 
            rows="4" 
            placeholder="请输入回忆内容"
            required
          ></textarea>
        </div>
        
        <div class="form-group">
          <label for="images">图片 (最多10张)</label>
          <input 
            id="images" 
            type="file" 
            class="form-file" 
            accept="image/*" 
            multiple 
            @change="handleImageChange"
          >
          <div v-if="imagePreviews.length > 0" class="image-previews">
            <div 
              v-for="(preview, index) in imagePreviews" 
              :key="index" 
              class="image-preview"
            >
              <img :src="preview" :alt="`Preview ${index}`">
              <button 
                type="button" 
                class="remove-image" 
                @click="removeImage(index)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="form-actions">
          <button 
            type="button" 
            class="cancel-button" 
            @click="emit('cancel')"
            :disabled="isSubmitting"
          >
            取消
          </button>
          <button 
            type="submit" 
            class="submit-button" 
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? '保存中...' : '保存回忆' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.memory-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.memory-form {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 600px;
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
  color: var(--romantic-gray-medium);
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--romantic-radius);
  transition: var(--romantic-transition);
}

.close-button:hover {
  background-color: #f3f4f6;
}

form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea,
.form-file {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #ec4899;
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.form-file {
  padding: 0.5rem;
}

.image-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 100px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.remove-image {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--romantic-danger);
  color: white;
  border: none;
  border-radius: var(--romantic-radius);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
}

.error-message {
  color: #ef4444;
  background-color: #fee2e2;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-button,
.submit-button {
  padding: 0.75rem 1.5rem;
  border-radius: var(--romantic-radius);
  font-weight: 500;
  cursor: pointer;
  transition: var(--romantic-transition);
}

.cancel-button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
}

.cancel-button:hover {
  background: #e5e7eb;
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-button {
  background: #ec4899;
  border: none;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background: #db2777;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .memory-form {
    margin: 1rem;
  }
  
  .form-header {
    padding: 1rem;
  }
  
  form {
    padding: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .image-previews {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.5rem;
  }
  
  .image-preview {
    height: 80px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .cancel-button,
  .submit-button {
    width: 100%;
  }
}
</style>