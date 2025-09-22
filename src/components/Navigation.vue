<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

// User store
const userStore = useUserStore()
const router = useRouter()

// 移动端菜单开关状态
const isMenuOpen = ref(false)

// 切换移动端菜单
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// 关闭移动端菜单
const closeMenu = () => {
  isMenuOpen.value = false
}

// Logout function
const logout = () => {
  userStore.logout()
  router.push('/login')
  closeMenu()
}

// Fetch user profile on component mount
onMounted(() => {
  if (userStore.token) {
    userStore.fetchUserProfile()
  }
})
</script>

<style scoped>
.romantic-navigation {
  background: var(--romantic-white);
  box-shadow: var(--romantic-shadow);
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
}

.romantic-navigation-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--romantic-spacing-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.romantic-logo-link {
  font-size: 28px;
  font-weight: var(--romantic-font-weight-bold);
  color: var(--romantic-primary);
  text-decoration: none;
  transition: var(--romantic-transition);
}

.romantic-logo-link:hover {
  color: var(--romantic-primary-dark);
}

.romantic-desktop-menu {
  display: none;
}

.romantic-menu-link {
  text-decoration: none;
  color: var(--romantic-dark);
  font-weight: var(--romantic-font-weight-medium);
  padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
  border-radius: var(--romantic-radius);
  transition: var(--romantic-transition);
  position: relative;
}

.romantic-menu-link:hover {
  color: var(--romantic-primary);
  background: var(--romantic-light);
}

.romantic-menu-link-active {
  color: var(--romantic-primary);
  background: var(--romantic-light);
}

.romantic-menu-link-active::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 3px;
  background: var(--romantic-primary);
  border-radius: 3px;
}

.romantic-logout-button {
  background: none;
  border: none;
  color: var(--romantic-dark);
  font-weight: var(--romantic-font-weight-medium);
  padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
  border-radius: var(--romantic-radius);
  transition: var(--romantic-transition);
  cursor: pointer;
}

.romantic-logout-button:hover {
  color: var(--romantic-danger);
  background: var(--romantic-gray);
}

.romantic-mobile-menu-button {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 21px;
  cursor: pointer;
}

.romantic-menu-bar {
  height: 3px;
  width: 100%;
  background: var(--romantic-primary);
  border-radius: 10px;
  transition: var(--romantic-transition);
}

.romantic-mobile-menu {
  position: absolute;
  top: 70px;
  left: 0;
  width: 100%;
  background: var(--romantic-white);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--romantic-spacing-4);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  transform: translateY(-150%);
  transition: transform 0.3s ease;
  z-index: 50;
}

.romantic-mobile-menu-open {
  transform: translateY(0);
  display: flex;
}

.romantic-mobile-menu-closed {
  display: none;
}

.romantic-mobile-menu-item {
  width: 100%;
  text-align: center;
  margin: var(--romantic-spacing-1) 0;
}

.romantic-mobile-menu-link {
  display: block;
  padding: var(--romantic-spacing-4);
  font-size: var(--romantic-font-size-lg);
  text-decoration: none;
  color: var(--romantic-dark);
  font-weight: var(--romantic-font-weight-medium);
  border-radius: 0;
  transition: var(--romantic-transition);
  position: relative;
}

.romantic-mobile-menu-link:hover {
  color: var(--romantic-primary);
  background: var(--romantic-light);
}

.romantic-mobile-menu-link-active {
  color: var(--romantic-primary);
  background: var(--romantic-light);
}

.romantic-mobile-menu-link-active::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 3px;
  background: var(--romantic-primary);
  border-radius: 3px;
}

.romantic-mobile-logout-button {
  display: block;
  width: 100%;
  padding: var(--romantic-spacing-4);
  font-size: var(--romantic-font-size-lg);
  background: none;
  border: none;
  color: var(--romantic-dark);
  font-weight: var(--romantic-font-weight-medium);
  border-radius: 0;
  transition: var(--romantic-transition);
  cursor: pointer;
}

.romantic-mobile-logout-button:hover {
  color: var(--romantic-danger);
  background: var(--romantic-gray);
}

/* Desktop styles */
@media (min-width: 768px) {
  .romantic-desktop-menu {
    display: flex;
    gap: var(--romantic-spacing-8);
    list-style: none;
  }
  
  .romantic-mobile-menu-button {
    display: none;
  }
  
  .romantic-mobile-menu {
    display: none;
  }
}
</style>

<template>
  <nav class="romantic-navigation">
    <div class="romantic-navigation-container">
      <div>
        <RouterLink 
          to="/" 
          @click="closeMenu"
          class="romantic-logo-link"
        >
          ❤️ Love Story
        </RouterLink>
      </div>
      
      <!-- 桌面端导航菜单 -->
      <ul class="romantic-desktop-menu">
        <li>
          <RouterLink 
            to="/" 
            @click="closeMenu"
            class="romantic-menu-link"
            active-class="romantic-menu-link-active"
          >
            首页
          </RouterLink>
        </li>
        <li>
          <RouterLink 
            to="/memories" 
            @click="closeMenu"
            class="romantic-menu-link"
            active-class="romantic-menu-link-active"
          >
            回忆
          </RouterLink>
        </li>
        <li>
          <RouterLink 
            to="/photos" 
            @click="closeMenu"
            class="romantic-menu-link"
            active-class="romantic-menu-link-active"
          >
            相册
          </RouterLink>
        </li>
        <li>
          <RouterLink 
            to="/anniversaries" 
            @click="closeMenu"
            class="romantic-menu-link"
            active-class="romantic-menu-link-active"
          >
            纪念日
          </RouterLink>
        </li>
        <li>
          <RouterLink 
            to="/about" 
            @click="closeMenu"
            class="romantic-menu-link"
            active-class="romantic-menu-link-active"
          >
            关于
          </RouterLink>
        </li>
        <li>
          <RouterLink 
            to="/demo" 
            @click="closeMenu"
            class="romantic-menu-link"
            active-class="romantic-menu-link-active"
          >
            样式演示
          </RouterLink>
        </li>
        <li>
          <RouterLink 
            to="/lightning-css-test" 
            @click="closeMenu"
            class="romantic-menu-link"
            active-class="romantic-menu-link-active"
          >
            Lightning CSS 测试
          </RouterLink>
        </li>
        <template v-if="!userStore.isLoggedIn">
          <li>
            <RouterLink 
              to="/login" 
              @click="closeMenu"
              class="romantic-menu-link"
              active-class="romantic-menu-link-active"
            >
              登录
            </RouterLink>
          </li>
        </template>
        <template v-else>
          <li>
            <RouterLink 
              to="/profile" 
              @click="closeMenu"
              class="romantic-menu-link"
              active-class="romantic-menu-link-active"
            >
              用户
            </RouterLink>
          </li>
          <li>
            <button 
              @click="logout" 
              class="romantic-logout-button"
            >
              退出
            </button>
          </li>
        </template>
      </ul>
      
      <!-- 移动端菜单按钮 -->
      <div 
        class="romantic-mobile-menu-button"
        @click="toggleMenu"
      >
        <span class="romantic-menu-bar"></span>
        <span class="romantic-menu-bar"></span>
        <span class="romantic-menu-bar"></span>
      </div>
    </div>
    
    <!-- 移动端导航菜单 -->
    <ul 
      class="romantic-mobile-menu"
      :class="{ 'romantic-mobile-menu-open': isMenuOpen, 'romantic-mobile-menu-closed': !isMenuOpen }"
    >
      <li class="romantic-mobile-menu-item">
        <RouterLink 
          to="/" 
          @click="closeMenu"
          class="romantic-mobile-menu-link"
          active-class="romantic-mobile-menu-link-active"
        >
          首页
        </RouterLink>
      </li>
      <li class="romantic-mobile-menu-item">
        <RouterLink 
          to="/memories" 
          @click="closeMenu"
          class="romantic-mobile-menu-link"
          active-class="romantic-mobile-menu-link-active"
        >
          回忆
        </RouterLink>
      </li>
      <li class="romantic-mobile-menu-item">
        <RouterLink 
          to="/photos" 
          @click="closeMenu"
          class="romantic-mobile-menu-link"
          active-class="romantic-mobile-menu-link-active"
        >
          相册
        </RouterLink>
      </li>
      <li class="romantic-mobile-menu-item">
        <RouterLink 
          to="/anniversaries" 
          @click="closeMenu"
          class="romantic-mobile-menu-link"
          active-class="romantic-mobile-menu-link-active"
        >
          纪念日
        </RouterLink>
      </li>
      <li class="romantic-mobile-menu-item">
        <RouterLink 
          to="/about" 
          @click="closeMenu"
          class="romantic-mobile-menu-link"
          active-class="romantic-mobile-menu-link-active"
        >
          关于
        </RouterLink>
      </li>
      <li class="romantic-mobile-menu-item">
        <RouterLink 
          to="/demo" 
          @click="closeMenu"
          class="romantic-mobile-menu-link"
          active-class="romantic-mobile-menu-link-active"
        >
          样式演示
        </RouterLink>
      </li>
      <li class="romantic-mobile-menu-item">
        <RouterLink 
          to="/lightning-css-test" 
          @click="closeMenu"
          class="romantic-mobile-menu-link"
          active-class="romantic-mobile-menu-link-active"
        >
          Lightning CSS 测试
        </RouterLink>
      </li>
      <template v-if="!userStore.isLoggedIn">
        <li class="romantic-mobile-menu-item">
          <RouterLink 
            to="/login" 
            @click="closeMenu"
            class="romantic-mobile-menu-link"
            active-class="romantic-mobile-menu-link-active"
          >
            登录
          </RouterLink>
        </li>
      </template>
      <template v-else>
        <li class="romantic-mobile-menu-item">
          <RouterLink 
            to="/profile" 
            @click="closeMenu"
            class="romantic-mobile-menu-link"
            active-class="romantic-mobile-menu-link-active"
          >
            用户
          </RouterLink>
        </li>
        <li class="romantic-mobile-menu-item">
          <button 
            @click="logout" 
            class="romantic-mobile-logout-button"
          >
            退出
          </button>
        </li>
      </template>
    </ul>
  </nav>
</template>