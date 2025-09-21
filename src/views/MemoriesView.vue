<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MemoryCard from '../components/MemoryCard.vue'
import MemoryForm from '../components/MemoryForm.vue'
import { memoryAPI } from '../services/api'
import type { Memory } from '../types/api'

// 记忆数据
const memories = ref<Memory[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingMemory = ref<Memory | null>(null)

// 获取记忆数据
const fetchMemories = async () => {
  try {
    loading.value = true
    const response = await memoryAPI.getAll()
    memories.value = response.data
  } catch (err) {
    console.error('获取记忆数据失败:', err)
    error.value = '获取记忆数据失败'
  } finally {
    loading.value = false
  }
}

// 处理添加记忆
const handleAddMemory = () => {
  editingMemory.value = null
  showForm.value = true
}

// 处理编辑记忆
const handleEditMemory = (memory: Memory) => {
  editingMemory.value = memory
  showForm.value = true
}

// 处理保存记忆（添加或编辑）
const handleSaveMemory = (memory: Memory) => {
  showForm.value = false
  editingMemory.value = null
  fetchMemories()
}

// 处理删除记忆
const handleDeleteMemory = async (id: string) => {
  try {
    await memoryAPI.delete(id)
    // 从本地状态中移除已删除的记忆
    memories.value = memories.value.filter(memory => memory._id !== id)
  } catch (err) {
    console.error('删除记忆失败:', err)
    error.value = '删除记忆失败'
  }
}

// 处理取消表单
const handleCancelForm = () => {
  showForm.value = false
  editingMemory.value = null
}

// 页面加载时获取数据
onMounted(() => {
  fetchMemories()
})
</script>

<template>
  <div class="memories-page">
    <header class="page-header">
      <h1 class="text-3xl font-bold text-center mb-8">我们的爱情回忆</h1>
      <p class="text-center text-gray-600 mb-10">记录我们在一起的每一个美好时刻</p>
    </header>

    <div v-if="loading" class="text-center py-10">
      <div class="loading-spinner"></div>
      <p class="mt-2">加载中...</p>
    </div>

    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-500">{{ error }}</p>
      <button 
        @click="fetchMemories" 
        class="mt-4 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
      >
        重新加载
      </button>
    </div>

    <div v-else>
      <div class="memory-timeline">
        <div 
          v-for="memory in memories" 
          :key="memory._id" 
          class="memory-item"
        >
          <MemoryCard 
            :memory="{
              id: memory._id,
              title: memory.title,
              date: memory.date,
              content: memory.description,
              image: memory.images && memory.images.length > 0 ? memory.images[0].url : undefined
            }" 
            @edit="handleEditMemory(memory)"
            @delete="handleDeleteMemory"
          />
        </div>
      </div>

      <div class="text-center mt-10">
        <button 
          @click="handleAddMemory"
          class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
        >
          添加新的回忆
        </button>
      </div>
    </div>

    <!-- 记忆表单模态框 -->
    <MemoryForm 
      v-if="showForm"
      :memory="editingMemory"
      @save="handleSaveMemory"
      @cancel="handleCancelForm"
    />
  </div>
</template>

<style scoped>
.memories-page {
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

.memory-timeline {
  position: relative;
}

/* 时间轴线 */
.memory-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ec4899; /* pink-500 */
}

.memory-item {
  margin-bottom: 2rem;
}

.memory-item:last-child {
  margin-bottom: 0;
}

/* 响应式设计 */
@media (min-width: 768px) {
  .memory-timeline::before {
    left: 50%;
    transform: translateX(-50%);
  }
  
  .memories-page {
    padding: 2rem;
  }
  
  .page-header h1 {
    font-size: 2.5rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 768px) {
  .memories-page {
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
  
  .memory-timeline::before {
    left: 15px;
  }
  
  .memory-item {
    margin-bottom: 1.5rem;
  }
  
  .text-center {
    margin-top: 2rem;
  }
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

@media (max-width: 480px) {
  .memories-page {
    padding: 0.5rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .page-header p {
    font-size: 0.9rem;
  }
  
  .memory-timeline::before {
    left: 12px;
  }
  
  .memory-item {
    margin-bottom: 1rem;
  }
}
</style>