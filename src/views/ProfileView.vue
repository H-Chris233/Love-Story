<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()

// Computed property for user info
const userInfo = computed(() => userStore.user)

// 获取用户信息
onMounted(() => {
  if (!userStore.user) {
    userStore.fetchUserProfile()
  }
})
</script>

<template>
  <div class="romantic-home romantic-fade-in">
    <div class="romantic-container">
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-icon">👤</div>
        </div>
        <h1 class="romantic-title romantic-title-md profile-title">用户信息</h1>
        <p class="romantic-subtitle" v-if="userInfo">欢迎回来，{{ userInfo.name }}！</p>
      </div>
      
      <div class="profile-content" v-if="userInfo">
        <div class="romantic-card profile-card">
          <div class="romantic-card-header">
            <h2 class="romantic-card-title">个人资料</h2>
          </div>
          
          <div class="romantic-card-body">
            <div class="profile-info">
              <div class="info-item">
                <div class="info-icon">📝</div>
                <div class="info-content">
                  <label>姓名</label>
                  <span>{{ userInfo.name }}</span>
                </div>
              </div>
              
              <div class="info-item">
                <div class="info-icon">📧</div>
                <div class="info-content">
                  <label>邮箱</label>
                  <span>{{ userInfo.email }}</span>
                </div>
              </div>
              

              
              <div class="info-item">
                <div class="info-icon">⭐</div>
                <div class="info-content">
                  <label>账户类型</label>
                  <span>{{ userInfo.isAdmin ? '管理员账户' : '普通用户' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="profile-content" v-else>
        <div class="romantic-card">
          <div class="romantic-card-body">
            <div class="loading-message">
              <div class="romantic-spinner"></div>
              <p>加载用户信息中...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.romantic-home {
  min-height: calc(100vh - 70px);
  background: var(--romantic-gradient);
  padding: var(--romantic-spacing-6);
}

.profile-header {
  text-align: center;
  margin-bottom: var(--romantic-spacing-8);
}

.profile-avatar {
  margin-bottom: var(--romantic-spacing-4);
}

.avatar-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--romantic-primary), var(--romantic-secondary));
  border-radius: var(--romantic-radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--romantic-white);
  box-shadow: var(--romantic-shadow-lg);
  margin: 0 auto;
}

.profile-title {
  color: var(--romantic-dark);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: var(--romantic-spacing-2);
}

.profile-card {
  max-width: 600px;
  margin: 0 auto;
}



.profile-info {
  display: flex;
  flex-direction: column;
  gap: var(--romantic-spacing-6);
}

.info-item {
  display: flex;
  align-items: center;
  gap: var(--romantic-spacing-4);
  padding: var(--romantic-spacing-4);
  background: var(--romantic-light);
  border-radius: var(--romantic-radius);
  border-left: 4px solid var(--romantic-primary);
  transition: var(--romantic-transition);
}

.info-item:hover {
  background: rgba(255, 107, 157, 0.05);
  transform: translateX(4px);
}

.info-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  background: var(--romantic-primary);
  border-radius: var(--romantic-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.3);
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--romantic-spacing-1);
}

.info-content label {
  font-weight: var(--romantic-font-weight-semibold);
  color: var(--romantic-dark);
  font-size: var(--romantic-font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-content span {
  color: var(--romantic-dark-medium);
  font-size: var(--romantic-font-size-lg);
  font-weight: var(--romantic-font-weight-medium);
}

.loading-message {
  text-align: center;
  padding: var(--romantic-spacing-12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--romantic-spacing-4);
}

.loading-message p {
  color: var(--romantic-dark-medium);
  font-size: var(--romantic-font-size-lg);
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .romantic-home {
    padding: var(--romantic-spacing-4);
  }
  
  .profile-header {
    margin-bottom: var(--romantic-spacing-6);
  }
  
  .avatar-icon {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }
  
  .profile-info {
    gap: var(--romantic-spacing-4);
  }
  
  .info-item {
    padding: var(--romantic-spacing-3);
    gap: var(--romantic-spacing-3);
  }
  
  .info-icon {
    width: 32px;
    height: 32px;
    font-size: 1.2rem;
  }
  
  .info-content span {
    font-size: var(--romantic-font-size-base);
  }
}

@media (max-width: 480px) {
  .romantic-home {
    padding: var(--romantic-spacing-3);
  }
  
  .info-item {
    flex-direction: column;
    text-align: center;
    gap: var(--romantic-spacing-2);
  }
  
  .info-content {
    align-items: center;
  }
}

/* 动画效果 */
.info-item {
  animation: romanticFadeInUp 0.6s ease-out forwards;
}

.info-item:nth-child(1) { animation-delay: 0.1s; }
.info-item:nth-child(2) { animation-delay: 0.2s; }
.info-item:nth-child(3) { animation-delay: 0.3s; }
</style>