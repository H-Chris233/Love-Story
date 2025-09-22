<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()

// Computed property for user info
const userInfo = computed(() => userStore.user)
</script>

<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1 class="profile-title">用户信息</h1>
    </div>
    
    <div class="profile-content" v-if="userInfo">
      <div class="profile-card">
        <div class="profile-info">
          <div class="info-item">
            <label>姓名:</label>
            <span>{{ userInfo.name }}</span>
          </div>
          <div class="info-item">
            <label>邮箱:</label>
            <span>{{ userInfo.email }}</span>
          </div>
          <div class="info-item">
            <label>注册时间:</label>
            <span>{{ new Date(userInfo.createdAt).toLocaleDateString('zh-CN') }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="profile-content" v-else>
      <div class="loading-message">
        加载中...
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-header {
  text-align: center;
  margin-bottom: 2rem;
}

.profile-title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--romantic-primary);
  margin-bottom: 0.5rem;
}

.profile-content {
  background: white;
  border-radius: 12px;
  box-shadow: var(--romantic-shadow);
  padding: 2rem;
}

.profile-card {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item label {
  font-weight: bold;
  color: var(--romantic-dark);
}

.info-item span {
  color: var(--romantic-gray-dark);
  font-size: 1.1rem;
}

.loading-message {
  text-align: center;
  padding: 2rem;
  color: var(--romantic-gray);
  font-size: 1.1rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-container {
    padding: 1rem;
  }
  
  .profile-content {
    padding: 1.5rem;
  }
  
  .profile-title {
    font-size: 1.5rem;
  }
}
</style>