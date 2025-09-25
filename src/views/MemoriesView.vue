<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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

// 分页相关
const currentPage = ref(1)
const memoriesPerPage = 10 // 每页显示10个记忆
const totalPages = computed(() => Math.ceil(memories.value.length / memoriesPerPage))

// 获取当前页的记忆数据
const paginatedMemories = computed(() => {
  const startIndex = (currentPage.value - 1) * memoriesPerPage
  const endIndex = startIndex + memoriesPerPage
  return memories.value.slice(startIndex, endIndex)
})

// 获取记忆数据
const fetchMemories = async () => {
  try {
    loading.value = true
    const response = await memoryAPI.getAll()
    memories.value = response.data
    // 重置到第一页
    currentPage.value = 1
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
    // 如果当前页没有记忆了，且不是第一页，则跳转到上一页
    if (paginatedMemories.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }
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

// 处理分页
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchMemories()
})
</script>

<template>
  <div class="romantic-container romantic-py-8">
    <header class="romantic-mb-8">
      <h1 class="romantic-title romantic-title-md">我们的爱情回忆</h1>
      <p class="romantic-subtitle">记录我们在一起的每一个美好时刻</p>
    </header>

    <div v-if="loading" class="romantic-text-center romantic-py-10">
      <div class="romantic-spinner"></div>
      <p class="romantic-mt-2">加载中...</p>
    </div>

    <div v-else-if="error" class="romantic-text-center romantic-py-10">
      <p class="romantic-text-danger">{{ error }}</p>
      <button 
        @click="fetchMemories" 
        class="romantic-button romantic-mt-4"
      >
        重新加载
      </button>
    </div>

    <div v-else>
      <div class="romantic-relative">
        <div 
          v-for="memory in paginatedMemories" 
          :key="memory._id" 
          class="romantic-mb-8"
        >
          <MemoryCard 
            :memory="memory" 
            @edit="handleEditMemory"
            @delete="handleDeleteMemory"
          />
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
          @click="handleAddMemory"
          class="romantic-button romantic-button-lg"
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
/* 小屏手机优化 */
@media (max-width: 768px) {
  .romantic-py-8 {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
  
  .romantic-mb-8 {
    margin-bottom: 1rem;
  }
  
  .romantic-title {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
  }
  
  .romantic-subtitle {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  
  .romantic-mb-8 {
    margin-bottom: 1.5rem;
  }
  
  .romantic-mt-10 {
    margin-top: 2rem;
  }
}

@media (max-width: 480px) {
  .romantic-py-8 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  
  .romantic-title {
    font-size: 1.5rem;
  }
  
  .romantic-subtitle {
    font-size: 0.9rem;
  }
  
  .romantic-mb-8 {
    margin-bottom: 1rem;
  }
}
</style>