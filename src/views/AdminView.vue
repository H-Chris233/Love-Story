<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI } from '../services/api'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const router = useRouter()

// Reactive data
const name = ref('')
const email = ref('')
const password = ref('')
const adminPassword = ref('')
const isSubmitting = ref(false)
const success = ref('')
const error = ref('')
const isAdmin = ref(false)

// Check if user is admin
onMounted(() => {
  // For now, we'll just check if the user is logged in
  // In a real implementation, you would have a more robust admin check
  if (userStore.isLoggedIn) {
    isAdmin.value = true
  } else {
    router.push('/login')
  }
})

// Create user function
const createUser = async () => {
  if (!name.value || !email.value || !password.value) {
    error.value = '请填写所有字段'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码长度至少为6位'
    return
  }

  isSubmitting.value = true
  success.value = ''
  error.value = ''

  try {
    // Call register API
    await authAPI.register({
      name: name.value,
      email: email.value,
      password: password.value
    })

    success.value = '用户创建成功'
    
    // Clear form
    name.value = ''
    email.value = ''
    password.value = ''
  } catch (err: any) {
    console.error('创建用户错误:', err)
    if (err.response?.status === 400) {
      error.value = '用户已存在'
    } else {
      error.value = '创建用户失败，请重试'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1 class="admin-title">管理员面板</h1>
      <p class="admin-subtitle">创建新用户</p>
    </div>
    
    <div class="admin-content" v-if="isAdmin">
      <div class="admin-card">
        <form @submit.prevent="createUser">
          <div class="form-group">
            <label for="name">姓名 *</label>
            <input 
              id="name" 
              v-model="name" 
              type="text" 
              class="form-input" 
              placeholder="请输入用户姓名"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="email">邮箱 *</label>
            <input 
              id="email" 
              v-model="email" 
              type="email" 
              class="form-input" 
              placeholder="请输入用户邮箱"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="password">密码 *</label>
            <input 
              id="password" 
              v-model="password" 
              type="password" 
              class="form-input" 
              placeholder="请输入密码（至少6位）"
              required
            >
          </div>
          
          <div v-if="success" class="success-message">
            {{ success }}
          </div>
          
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="submit-button" 
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? '创建中...' : '创建用户' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <div class="admin-content" v-else>
      <div class="access-denied">
        <h2>访问被拒绝</h2>
        <p>您需要登录才能访问此页面。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.admin-header {
  text-align: center;
  margin-bottom: 2rem;
}

.admin-title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--romantic-primary);
  margin-bottom: 0.5rem;
}

.admin-subtitle {
  color: var(--romantic-gray-dark);
  font-size: 1.1rem;
}

.admin-content {
  background: white;
  border-radius: 12px;
  box-shadow: var(--romantic-shadow);
  padding: 2rem;
}

.admin-card {
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--romantic-dark);
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
  border-color: var(--romantic-primary);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
}

.success-message {
  color: #10b981;
  background-color: #d1fae5;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.error-message {
  color: #ef4444;
  background-color: #fee2e2;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.form-actions {
  margin-top: 2rem;
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background: var(--romantic-primary);
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background: var(--romantic-primary-dark);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .admin-container {
    padding: 1rem;
  }
  
  .admin-content {
    padding: 1.5rem;
  }
  
  .admin-title {
    font-size: 1.5rem;
  }
}
</style>