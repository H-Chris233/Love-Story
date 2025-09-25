<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI } from '../services/api'
import { useUserStore } from '../stores/user'
import type { User } from '../types/api'

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

// User management
const users = ref<User[]>([])
const loadingUsers = ref(false)
const userError = ref('')
const activeTab = ref('create') // 'create' or 'manage'

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
      const errorData = err.response?.data
      if (errorData?.message === 'User already exists') {
        error.value = '用户已存在'
      } else if (errorData?.message === 'Validation failed') {
        error.value = errorData.errors?.[0] || errorData.details || '数据验证失败'
      } else {
        error.value = errorData?.message || '用户已存在或数据无效'
      }
    } else {
      error.value = '创建用户失败，请重试'
    }
  } finally {
    isSubmitting.value = false
  }
}

// Fetch all users
const fetchUsers = async () => {
  loadingUsers.value = true
  userError.value = ''
  
  try {
    const response = await authAPI.getAllUsers()
    users.value = response.data
    console.log('✅ [ADMIN] Fetched users:', users.value.length)
  } catch (err: any) {
    console.error('❌ [ADMIN] Error fetching users:', err)
    userError.value = '获取用户列表失败'
  } finally {
    loadingUsers.value = false
  }
}

// Delete user
const deleteUser = async (userId: string, userName: string) => {
  if (!confirm(`确定要删除用户 "${userName}" 吗？此操作不可撤销。`)) {
    return
  }
  
  try {
    await authAPI.deleteUser(userId)
    success.value = '用户删除成功'
    
    // Refresh user list
    await fetchUsers()
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      success.value = ''
    }, 3000)
    
  } catch (err: any) {
    console.error('❌ [ADMIN] Error deleting user:', err)
    if (err.response?.status === 403) {
      error.value = '权限不足'
    } else if (err.response?.status === 400) {
      error.value = err.response?.data?.message || '无法删除用户'
    } else {
      error.value = '删除用户失败，请重试'
    }
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      error.value = ''
    }, 5000)
  }
}

// Switch tabs and fetch users when switching to manage tab
const switchTab = (tab: string) => {
  activeTab.value = tab
  if (tab === 'manage') {
    fetchUsers()
  }
}
</script>

<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1 class="admin-title">管理员面板</h1>
      
      <!-- Tab Navigation -->
      <div class="admin-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'create' }]"
          @click="switchTab('create')"
        >
          创建用户
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'manage' }]"
          @click="switchTab('manage')"
        >
          用户管理
        </button>
      </div>
    </div>
    
    <div class="admin-content" v-if="isAdmin">
      <!-- Create User Tab -->
      <div v-if="activeTab === 'create'" class="admin-card">
        <h2 class="card-title">创建新用户</h2>
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
      
      <!-- User Management Tab -->
      <div v-if="activeTab === 'manage'" class="admin-card">
        <h2 class="card-title">用户管理</h2>
        
        <div v-if="loadingUsers" class="loading-message">
          正在加载用户列表...
        </div>
        
        <div v-if="userError" class="error-message">
          {{ userError }}
        </div>
        
        <div v-if="success" class="success-message">
          {{ success }}
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div v-if="!loadingUsers && !userError && users.length > 0" class="users-table">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user._id">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span :class="['role-badge', { admin: user.isAdmin }]">
                    {{ user.isAdmin ? '管理员' : '普通用户' }}
                  </span>
                </td>
                <td>{{ new Date(user.createdAt).toLocaleDateString('zh-CN') }}</td>
                <td>
                  <button 
                    v-if="user._id !== userStore.user?._id"
                    @click="deleteUser(user._id, user.name)"
                    class="delete-button"
                  >
                    删除
                  </button>
                  <span v-else class="current-user">当前用户</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-if="!loadingUsers && !userError && users.length === 0" class="no-users">
          暂无用户数据
        </div>
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

/* Tab styles */
.admin-tabs {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--romantic-primary);
  background: white;
  color: var(--romantic-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.tab-button:hover {
  background: rgba(236, 72, 153, 0.1);
}

.tab-button.active {
  background: var(--romantic-primary);
  color: white;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--romantic-primary);
  margin-bottom: 1.5rem;
  text-align: center;
}

/* User management table styles */
.admin-card {
  max-width: none;
}

.users-table {
  overflow-x: auto;
}

.users-table table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.users-table th,
.users-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.users-table th {
  background: #f9fafb;
  font-weight: 600;
  color: var(--romantic-dark);
}

.role-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  background: #e5e7eb;
  color: #374151;
}

.role-badge.admin {
  background: #fef3c7;
  color: #92400e;
}

.delete-button {
  padding: 0.375rem 0.75rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.delete-button:hover {
  background: #dc2626;
}

.current-user {
  font-size: 0.875rem;
  color: var(--romantic-gray-600);
  font-style: italic;
}

.loading-message,
.no-users {
  text-align: center;
  padding: 2rem;
  color: var(--romantic-gray-600);
}

/* Mobile responsiveness for table */
@media (max-width: 768px) {
  .admin-tabs {
    flex-direction: column;
    align-items: center;
  }
  
  .tab-button {
    width: 200px;
  }
  
  .users-table {
    font-size: 0.875rem;
  }
  
  .users-table th,
  .users-table td {
    padding: 0.5rem;
  }
}
</style>