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
const newImages = ref<File[]>([]) // 新上传的图片文件
const allPreviews = ref<{type: 'existing' | 'new', url: string, index: number, publicId?: string}[]>([]) // 所有图片预览
const existingImages = ref<{url: string, publicId: string}[]>([]) // 用于存储已存在的图片信息
const imagesToDelete = ref<string[]>([]) // 用于跟踪要删除的图片publicId
const isSubmitting = ref(false)
const error = ref('')

// 获取完整的图片URL
const getFullImageUrl = (imageUrl: string) => {
  // 如果URL已经是完整的URL，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // 构建完整的API URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const serverUrl = baseUrl.replace('/api', '')
  const fullUrl = `${serverUrl}${imageUrl}`
  
  return fullUrl
}

// 如果是编辑模式，初始化表单数据
onMounted(() => {
  console.log(`🖼️ [MEMORY-FORM] Initializing form, mode: ${props.memory ? 'edit' : 'create'}`)
  if (props.memory) {
    title.value = props.memory.title
    date.value = new Date(props.memory.date).toISOString().split('T')[0]
    description.value = props.memory.description
    // 在编辑模式下显示已有的图片
    if (props.memory.images) {
      existingImages.value = [...props.memory.images]
      allPreviews.value = props.memory.images.map((img, index) => ({
        type: 'existing',
        url: getFullImageUrl(img.url),
        index,
        publicId: img.publicId
      }))
    }
    console.log(`🖼️ [MEMORY-FORM] Edit mode initialized for memory: ${props.memory._id}`)
  } else {
    console.log('🖼️ [MEMORY-FORM] Create mode initialized')
  }
})

// 处理图片选择
const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    console.log(`🖼️ [MEMORY-FORM] Processing ${files.length} selected files`, files)
    
    // 验证文件类型
    const validFiles = [] as File[]
    const invalidFiles = [] as File[]
    
    for (const file of files) {
      console.log(`🔍 [MEMORY-FORM] Checking file: ${file.name}, MIME type: "${file.type}", size: ${file.size} bytes`)
      
      // 首先检查MIME类型（最可靠的方法）
      const isValidByMimeType = file.type && file.type.startsWith('image/')
      
      // 如果MIME类型有效，直接接受
      if (isValidByMimeType) {
        console.log(`✅ [MEMORY-FORM] File ${file.name} passed MIME type validation: ${file.type}`)
        validFiles.push(file)
        continue
      }
      
      // 如果MIME类型无效或缺失，检查文件扩展名作为备用
      const isValidByExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name)
      
      if (isValidByExtension) {
        console.log(`✅ [MEMORY-FORM] File ${file.name} passed extension validation (MIME type missing or invalid: "${file.type}")`)
        validFiles.push(file)
      } else {
        // 检查是否是没有扩展名但可能是图片的文件
        const hasNoExtension = !file.name.includes('.')
        const hasEmptyMimeType = !file.type || file.type === ''
        
        if (hasNoExtension && file.size > 0) {
          console.log(`⚠️ [MEMORY-FORM] File ${file.name} has no extension, but has content (${file.size} bytes), attempting to process as image`)
          // 对于没有扩展名但有内容的文件，假设它可能是图片
          // 让后端的MIME类型检测来最终验证
          validFiles.push(file)
        } else if (hasEmptyMimeType && file.size > 0) {
          console.log(`⚠️ [MEMORY-FORM] File ${file.name} has empty MIME type, but has content, attempting to process as image`)
          // 对于MIME类型为空但有内容的文件，也给一次机会
          validFiles.push(file)
        } else {
          console.warn(`❌ [MEMORY-FORM] File ${file.name} format invalid - MIME: "${file.type}", extension: ${isValidByExtension}, size: ${file.size}`)
          invalidFiles.push(file)
        }
      }
    }
    
    if (invalidFiles.length > 0) {
      const fileDetails = invalidFiles.map(f => {
        const hasNoExtension = !f.name.includes('.')
        const mimeInfo = f.type ? f.type : 'unknown'
        if (hasNoExtension) {
          return `${f.name} (no extension, MIME: ${mimeInfo})`
        }
        return `${f.name} (MIME: ${mimeInfo})`
      }).join(', ')
      
      error.value = `Unsupported file formats: ${fileDetails}. Please ensure you select image files, consider renaming files to add proper extensions (.jpg, .png, .gif, etc.)`
      console.error(`❌ [MEMORY-FORM] Invalid file formats selected:`, invalidFiles)
      return
    }
    
    if (validFiles.length === 0) {
      error.value = 'Please select valid image files'
      console.error('❌ [MEMORY-FORM] No valid image files selected')
      return
    }
    
    // 检查文件大小限制（每个文件最大5MB）
    const oversizedFiles = validFiles.filter(file => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      const sizeInMB = (oversizedFiles[0].size / (1024 * 1024)).toFixed(2)
      error.value = `File "${oversizedFiles[0].name}" is ${sizeInMB}MB, exceeding 5MB limit. Please select smaller image files.`
      console.error(`❌ [MEMORY-FORM] File exceeds size limit:`, oversizedFiles[0])
      return
    }
    
    // 检查总图片数量限制
    const currentExistingCount = existingImages.value.length - imagesToDelete.value.length
    const totalImages = currentExistingCount + newImages.value.length + validFiles.length
    if (totalImages > 10) {
      error.value = `Total images will reach ${totalImages}, exceeding the 10 image limit. Currently have ${currentExistingCount + newImages.value.length} images, please remove some before adding more.`
      console.error(`❌ [MEMORY-FORM] Image count exceeds limit: ${totalImages} total, current: ${currentExistingCount + newImages.value.length}, adding: ${validFiles.length}`)
      return
    }
    
    // 清除之前的错误消息
    error.value = ''
    
    // 添加到新图片数组
    const startIndex = newImages.value.length
    newImages.value = [...newImages.value, ...validFiles]
    
    // 生成新图片预览
    validFiles.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          allPreviews.value.push({
            type: 'new',
            url: e.target.result as string,
            index: startIndex + index
          })
        }
      }
      reader.readAsDataURL(file)
    })
    
    // 清空input，允许重复选择相同文件
    target.value = ''
    
    console.log('✅ [MEMORY-FORM] Image selection completed:', {
      newImagesCount: newImages.value.length,
      allPreviewsCount: allPreviews.value.length,
      validFilesCount: validFiles.length
    })
  }
}

// 移除图片预览
const removeImage = (index: number) => {
  const preview = allPreviews.value[index]
  if (!preview) {
    console.error(`❌ [MEMORY-FORM] Attempted to remove image at invalid index: ${index}`)
    return
  }
  
  if (preview.type === 'existing' && preview.publicId) {
    // 这是已存在的图片，标记为删除
    imagesToDelete.value.push(preview.publicId)
    console.log(`🗑️ [MEMORY-FORM] Marked existing image for deletion: ${preview.publicId}`)
  } else if (preview.type === 'new' && preview.index !== undefined) {
    // 这是新添加的图片，从文件数组中移除
    const originalIndex = preview.index
    newImages.value.splice(originalIndex, 1)
    // 更新后续新图片的索引
    for (let i = index + 1; i < allPreviews.value.length; i++) {
      const laterPreview = allPreviews.value[i]
      if (laterPreview.type === 'new' && laterPreview.index !== undefined && laterPreview.index > originalIndex) {
        laterPreview.index--
      }
    }
    console.log(`🗑️ [MEMORY-FORM] Removed new image at original index: ${originalIndex}, remaining new images: ${newImages.value.length}`)
  }
  
  // 从预览数组中移除
  allPreviews.value.splice(index, 1)
  
  console.log('🗑️ [MEMORY-FORM] Image removal completed. Current state:', {
    allPreviewsCount: allPreviews.value.length,
    newImagesCount: newImages.value.length,
    imagesToDeleteCount: imagesToDelete.value.length
  })
}

// 提交表单
const handleSubmit = async () => {
  console.log('📝 [MEMORY-FORM] Starting form submission...')
  
  if (!title.value || !date.value || !description.value) {
    error.value = 'Please fill in all required fields'
    console.warn('❌ [MEMORY-FORM] Missing required fields')
    return
  }

  isSubmitting.value = true
  error.value = ''

  try {
    console.log('📤 [MEMORY-FORM] Preparing form submission...', {
      hasNewImages: newImages.value.length > 0,
      newImagesCount: newImages.value.length,
      hasImagesToDelete: imagesToDelete.value.length > 0,
      imagesToDeleteCount: imagesToDelete.value.length,
      allPreviewsCount: allPreviews.value.length,
      isEditMode: !!props.memory
    })

    // Always use FormData for consistency
    const formData = new FormData()
    formData.append('title', title.value)
    formData.append('date', date.value)
    formData.append('description', description.value)
    
    // Add new images
    if (newImages.value.length > 0) {
      console.log(`🖼️ [MEMORY-FORM] Adding ${newImages.value.length} new images to FormData`)
      newImages.value.forEach((image, index) => {
        console.log(`🖼️ [MEMORY-FORM] Adding image ${index + 1}: ${image.name}, size: ${image.size} bytes`)
        formData.append('images', image)
      })
    }
    
    // Add images to delete
    if (imagesToDelete.value.length > 0) {
      console.log(`🗑️ [MEMORY-FORM] Marking deletion of ${imagesToDelete.value.length} images:`, imagesToDelete.value)
      formData.append('imagesToDelete', JSON.stringify(imagesToDelete.value))
    }

    // Log FormData contents for debugging
    console.log('📋 [MEMORY-FORM] FormData contents:')
    const formDataEntries = []
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const fileInfo = `File(${value.name}, ${value.size} bytes, ${value.type})`
        console.log(`${key}: ${fileInfo}`)
        formDataEntries.push(`${key}: ${fileInfo}`)
      } else {
        console.log(`${key}: ${value}`)
        formDataEntries.push(`${key}: ${value}`)
      }
    }
    
    console.log('📋 [MEMORY-FORM] FormData total entries:', formDataEntries.length)
    console.log('📋 [MEMORY-FORM] newImages.value details:', newImages.value.map((img, i) => `${i}: ${img.name} (${img.size} bytes)`))
    
    // 验证FormData中确实包含了图片文件
    const imageEntries = []
    for (const [key, value] of formData.entries()) {
      if (key === 'images' && value instanceof File) {
        imageEntries.push(value.name)
      }
    }
    console.log('🖼️ [MEMORY-FORM] Image files in FormData:', imageEntries)

    let response
    if (props.memory) {
      // 编辑模式
      console.log(`✏️ [MEMORY-FORM] Updating memory with ID: ${props.memory._id}`)
      response = await memoryAPI.updateWithImages(props.memory._id, formData)
    } else {
      // 添加模式
      console.log('➕ [MEMORY-FORM] Creating new memory')
      response = await memoryAPI.createWithImages(formData)
    }

    console.log('✅ [MEMORY-FORM] Memory saved successfully:', response.data)
    emit('save', response.data)
  } catch (err: unknown) {
    console.error('❌ [MEMORY-FORM] Error saving memory:', err)
    console.error('❌ [MEMORY-FORM] Error details:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      response: err instanceof Object && 'response' in err ? (err as any).response?.data : undefined,
      status: err instanceof Object && 'response' in err ? (err as any).response?.status : undefined,
      timestamp: new Date().toISOString()
    })
    
    if (err instanceof Object && 'response' in err && (err as any).response?.data?.message) {
      error.value = (err as any).response.data.message
    } else {
      error.value = 'Error saving memory, please try again'
    }
  } finally {
    isSubmitting.value = false
    console.log('✅ [MEMORY-FORM] Form submission process completed')
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
          <label for="images">图片 (最多10张，每张不超过5MB)</label>
          <div class="file-input-wrapper">
            <input 
              id="images" 
              type="file" 
              class="form-file" 
              accept="image/*" 
              multiple 
              @change="handleImageChange"
            >
            <div class="file-input-placeholder">
              <span class="file-icon">📷</span>
              <span class="file-text">点击选择图片文件</span>
            </div>
          </div>
          <div v-if="allPreviews.length > 0" class="image-previews">
            <div 
              v-for="(preview, index) in allPreviews" 
              :key="`${preview.type}-${index}`" 
              class="image-preview"
              :class="{ 'existing-image': preview.type === 'existing', 'new-image': preview.type === 'new' }"
            >
              <img :src="preview.url" :alt="`Preview ${index}`">
              <button 
                type="button" 
                class="remove-image" 
                @click="removeImage(index)"
              >
                ×
              </button>
              <div class="image-type-badge">
                {{ preview.type === 'existing' ? '现有' : '新增' }}
              </div>
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

.file-input-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.form-file {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.file-input-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background-color: #f9fafb;
  color: #6b7280;
  font-size: 1rem;
  transition: all 0.2s;
  cursor: pointer;
}

.file-input-wrapper:hover .file-input-placeholder {
  border-color: #ec4899;
  background-color: #fdf2f8;
  color: #ec4899;
}

.file-icon {
  font-size: 1.5rem;
}

.file-text {
  font-weight: 500;
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

.image-type-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.existing-image .image-type-badge {
  background: rgba(34, 197, 94, 0.8);
}

.new-image .image-type-badge {
  background: rgba(59, 130, 246, 0.8);
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