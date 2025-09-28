<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI } from '../services/api'
import { useUserStore } from '../stores/user'
import type { AuthResponse, ApiError } from '../types/api'

// Router instance
const router = useRouter()
const userStore = useUserStore()

// Reactive data
const name = ref('')
const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const error = ref('')
const isRegisterMode = ref(false)
const registrationAllowed = ref(false)

// Check if registration is allowed
const checkRegistrationStatus = async () => {
  try {
    const response = await authAPI.checkRegistration()
    registrationAllowed.value = response.data.registrationAllowed
    if (registrationAllowed.value) {
      isRegisterMode.value = true
    }
  } catch (err) {
    console.error('检查注册状态失败:', err)
  }
}

// Login function
const login = async () => {
  if (!email.value || !password.value) {
    error.value = '请填写所有字段'
    return
  }

  isSubmitting.value = true
  error.value = ''

  try {
    // Call login API
    const response = await authAPI.login({
      email: email.value,
      password: password.value
    })

    // Save token to store and localStorage
    userStore.login(response.data.token)
    
    // Fetch user profile
    await userStore.fetchUserProfile()
    
    // Redirect to home page
    router.push('/')
  } catch (err: unknown) {
    console.error('登录错误:', err)
    if (err && typeof err === 'object' && 'response' in err && (err as ApiError).response?.status === 401) {
      error.value = '邮箱或密码错误'
    } else {
      error.value = '登录失败，请重试'
    }
  } finally {
    isSubmitting.value = false
  }
}

// Register function
const register = async () => {
  if (!name.value || !email.value || !password.value) {
    error.value = '请填写所有字段'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码至少6位'
    return
  }

  isSubmitting.value = true
  error.value = ''

  try {
    // Call register API
    const response = await authAPI.register({
      name: name.value,
      email: email.value,
      password: password.value
    })

    // Save token to store and localStorage
    userStore.login(response.data.token)
    
    // Fetch user profile
    await userStore.fetchUserProfile()
    
    // Redirect to home page
    router.push('/')
  } catch (err: unknown) {
    console.error('注册错误:', err)
    if (err && typeof err === 'object' && 'response' in err && (err as ApiError).response?.status === 400) {
      const errorData = (err as ApiError).response?.data
      if (errorData?.message === 'User already exists') {
        error.value = '用户已存在'
      } else if (errorData?.message === 'Validation failed') {
        error.value = errorData?.message || '数据验证失败'
      } else {
        error.value = errorData?.message || '用户已存在或数据无效'
      }
    } else {
      error.value = '注册失败，请重试'
    }
  } finally {
    isSubmitting.value = false
  }
}

// Submit handler
const handleSubmit = () => {
  if (isRegisterMode.value) {
    register()
  } else {
    login()
  }
}

// Toggle between login and register
const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value
  error.value = ''
}

onMounted(checkRegistrationStatus)
</script>

<template>
  <div class="login-container">
    <div class="login-form">
      <div class="form-header">
        <h2 class="text-2xl font-bold">{{ isRegisterMode ? '创建管理员账户' : '登录' }}</h2>
        <p class="text-gray-600 mt-2">
          {{ isRegisterMode ? '欢迎！您将成为第一个管理员' : '欢迎回到我们的爱情故事' }}
        </p>
      </div>
      
      <form @submit.prevent="handleSubmit">
        <div v-if="isRegisterMode" class="form-group">
          <label for="name">姓名 *</label>
          <input 
            id="name" 
            v-model="name" 
            type="text" 
            class="form-input" 
            placeholder="请输入您的姓名"
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
            placeholder="请输入您的邮箱"
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
            :placeholder="isRegisterMode ? '请输入密码（至少6位）' : '请输入密码'"
            required
          >
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
            {{ isSubmitting ? (isRegisterMode ? '创建中...' : '登录中...') : (isRegisterMode ? '创建管理员账户' : '登录') }}
          </button>
        </div>
      </form>
      
      <div class="form-footer">
        <p v-if="registrationAllowed && !isRegisterMode">
          <button @click="toggleMode" class="toggle-button">
            创建第一个管理员账户
          </button>
        </p>
        <p v-else-if="registrationAllowed && isRegisterMode">
          <button @click="toggleMode" class="toggle-button">
            已有账户？立即登录
          </button>
        </p>
        <p v-else>
          还没有账户？请联系管理员获取注册邀请
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 70px); /* 减去导航栏高度 */
  padding: 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
}

.login-form {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
  padding: 2rem;
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.form-header h2 {
  color: #ec4899;
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
  border-radius: var(--romantic-radius);
  color: white;
  font-weight: var(--romantic-font-weight-medium);
  font-size: var(--romantic-font-size-base);
  cursor: pointer;
  transition: var(--romantic-transition);
  box-shadow: var(--romantic-shadow);
}

.submit-button:hover:not(:disabled) {
  background: var(--romantic-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--romantic-shadow-hover);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.toggle-button {
  background: none;
  border: none;
  color: var(--romantic-primary);
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
  transition: var(--romantic-transition);
}

.toggle-button:hover {
  color: var(--romantic-primary-dark);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-form {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .form-header {
    margin-bottom: 1.5rem;
  }
}
</style>