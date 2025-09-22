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
const handleDeleteMemory = async (id: string | number) => {
  try {
    await memoryAPI.delete(id.toString())
    // 从本地状态中移除已删除的记忆
    memories.value = memories.value.filter(memory => memory._id !== id.toString())
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
  <div class="p-8 max-w-800px mx-auto md:p-8">
    <header class="mb-8 md:mb-8">
      <h1 class="text-2xl font-bold text-center mb-4 md:text-3xl md:mb-8">我们的爱情回忆</h1>
      <p class="text-center text-gray-600 mb-6 md:mb-10 md:text-lg">记录我们在一起的每一个美好时刻</p>
    </header>

    <div v-if="loading" class="text-center py-10">
      <div class="border-4 border-gray-200 border-t-4 border-t-pink-500 rounded-50% w-10 h-10 animate-spin mx-auto"></div>
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
      <div class="relative">
        <div 
          v-for="memory in memories" 
          :key="memory._id" 
          class="mb-8 last:mb-0 md:mb-8"
        >
          <MemoryCard 
            :memory="{
              id: memory._id,
              title: memory.title,
              date: memory.date,
              content: memory.description,
              images: memory.images ? memory.images.map(img => img.url) : []
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
/* 加载动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 小屏手机优化 */
@media (max-width: 768px) {
  .p-8.max-w-800px.mx-auto.md\:p-8 {
    padding: 1rem;
  }
  
  .mb-8.md\:mb-8 {
    margin-bottom: 1rem;
  }
  
  .text-2xl.font-bold.text-center.mb-4.md\:text-3xl.md\:mb-8 {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
  }
  
  .text-center.text-gray-600.mb-6.md\:mb-10.md\:text-lg {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  
  .mb-8.last\:mb-0.md\:mb-8 {
    margin-bottom: 1.5rem;
  }
  
  .text-center.mt-10 {
    margin-top: 2rem;
  }
}

@media (max-width: 480px) {
  .p-8.max-w-800px.mx-auto.md\:p-8 {
    padding: 0.5rem;
  }
  
  .text-2xl.font-bold.text-center.mb-4.md\:text-3xl.md\:mb-8 {
    font-size: 1.5rem;
  }
  
  .text-center.text-gray-600.mb-6.md\:mb-10.md\:text-lg {
    font-size: 0.9rem;
  }
  
  .mb-8.last\:mb-0.md\:mb-8 {
    margin-bottom: 1rem;
  }
}
</style>