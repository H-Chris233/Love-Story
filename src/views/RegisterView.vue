<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI } from '../services/api'
import { useUserStore } from '../stores/user'
import type { AuthResponse } from '../types/api'

// Router instance
const router = useRouter()
const userStore = useUserStore()

// Reactive data
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)
const error = ref('')

// Register function
const register = async () => {
  if (!name.value || !email.value || !password.value || !confirmPassword.value) {
    error.value = '请填写所有字段'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = '密码和确认密码不匹配'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码长度至少为6位'
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
  } catch (err: any) {
    console.error('注册错误:', err)
    if (err.response?.status === 400) {
      error.value = '用户已存在'
    } else {
      error.value = '注册失败，请重试'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-form">
      <div class="form-header">
        <h2 class="text-2xl font-bold">注册</h2>
        <p class="text-gray-600 mt-2">创建您的爱情故事账户</p>
      </div>
      
      <form @submit.prevent="register">
        <div class="form-group">
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
            placeholder="请输入密码（至少6位）"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">确认密码 *</label>
          <input 
            id="confirmPassword" 
            v-model="confirmPassword" 
            type="password" 
            class="form-input" 
            placeholder="请再次输入密码"
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
            {{ isSubmitting ? '注册中...' : '注册' }}
          </button>
        </div>
      </form>
      
      <div class="form-footer">
        <p>已有账户？ <a href="/login" class="text-pink-500 hover:underline">立即登录</a></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 70px); /* 减去导航栏高度 */
  padding: 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
}

.register-form {
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
  background: #ec4899;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background: #db2777;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .register-form {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .form-header {
    margin-bottom: 1.5rem;
  }
}
</style>