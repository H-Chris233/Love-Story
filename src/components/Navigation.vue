<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

// User store
const userStore = useUserStore()
const router = useRouter()

// 移动端菜单开关状态
const isMenuOpen = ref(false)

// 导航栏透明度状态
const navbarOpacity = ref(1)

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

// 处理页面滚动事件，改变导航栏透明度
const handleScroll = () => {
  const scrollPosition = window.scrollY
  // 根据滚动位置调整透明度，滚动越多透明度越不透明
  navbarOpacity.value = 1 - Math.min(scrollPosition / 100, 0.3) // 最多减少30%的透明度
}

// Fetch user profile on component mount
onMounted(() => {
  if (userStore.token) {
    userStore.fetchUserProfile()
  }
  // 添加滚动事件监听器
  window.addEventListener('scroll', handleScroll)
})

// 组件卸载时移除事件监听器
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
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
  transition: opacity 0.3s ease;
}

.romantic-navigation-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--romantic-spacing-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  min-height: 60px;
}

.romantic-logo-link {
  font-size: 28px;
  font-weight: var(--romantic-font-weight-bold);
  color: var(--romantic-primary);
  text-decoration: none;
  transition: var(--romantic-transition);
  display: flex;
  align-items: center;
  line-height: 1;
}

.romantic-logo-link:hover {
  color: var(--romantic-primary-dark);
}

.romantic-desktop-menu {
  display: none;
}

/* 水平滚动菜单 */
.romantic-scroll-menu {
  display: flex;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  padding: 0 var(--romantic-spacing-4);
  margin: 0 calc(var(--romantic-spacing-4) * -1);
}

.romantic-scroll-menu::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.romantic-scroll-menu-item {
  flex: 0 0 auto;
  margin-right: var(--romantic-spacing-4);
}

.romantic-scroll-menu-link {
  display: block;
  padding: var(--romantic-spacing-2) var(--romantic-spacing-3);
  font-weight: var(--romantic-font-weight-medium);
  text-decoration: none;
  color: var(--romantic-dark);
  border-radius: var(--romantic-radius);
  transition: var(--romantic-transition);
  white-space: nowrap;
}

.romantic-scroll-menu-link:hover {
  color: var(--romantic-primary);
  background: var(--romantic-light);
}

.romantic-scroll-menu-link-active {
  color: var(--romantic-primary);
  background: var(--romantic-light);
}

.romantic-scroll-menu-link-active::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--romantic-primary);
  border-radius: 3px;
}

.romantic-menu-link {
  text-decoration: none;
  color: var(--romantic-dark);
  font-weight: var(--romantic-font-weight-medium);
  padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
  border-radius: var(--romantic-radius);
  transition: var(--romantic-transition), opacity 0.3s ease;
  position: relative;
  opacity: 0.9;
}

.romantic-menu-link:hover {
  color: var(--romantic-primary);
  background: var(--romantic-light);
  opacity: 1;
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
  justify-content: center;
  align-items: center;
  width: 30px;
  height: 30px;
  cursor: pointer;
  gap: 4px;
}

.romantic-menu-bar {
  height: 3px;
  width: 100%;
  background: var(--romantic-primary);
  border-radius: 10px;
  transition: var(--romantic-transition);
}

.romantic-mobile-menu {
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  background: var(--romantic-white);
  padding: var(--romantic-spacing-2) var(--romantic-spacing-4);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 50;
  opacity: 0;
  transform: translateY(-10px);
  visibility: hidden;
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s ease;
  max-height: 0;
  overflow: hidden;
}

.romantic-mobile-menu-open {
  display: block;
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
  max-height: 300px; /* Adjust as needed */
}

.romantic-mobile-menu-closed {
  opacity: 0;
  transform: translateY(-10px);
  visibility: hidden;
  max-height: 0;
  overflow: hidden;
}

.romantic-mobile-menu-items {
  display: flex;
  align-items: center;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  padding: var(--romantic-spacing-3) 0;
  /* 添加一个指示器，显示可以滚动 */
  mask-image: linear-gradient(to right, 
    rgba(0, 0, 0, 0) 0%, 
    rgba(0, 0, 0, 1) var(--romantic-spacing-4), 
    rgba(0, 0, 0, 1) calc(100% - var(--romantic-spacing-4)), 
    rgba(0, 0, 0, 0) 100%);
  -webkit-mask-image: linear-gradient(to right, 
    rgba(0, 0, 0, 0) 0%, 
    rgba(0, 0, 0, 1) var(--romantic-spacing-4), 
    rgba(0, 0, 0, 1) calc(100% - var(--romantic-spacing-4)), 
    rgba(0, 0, 0, 0) 100%);
}

.romantic-mobile-menu-items::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.romantic-mobile-menu-item {
  flex: 0 0 auto;
  margin-right: var(--romantic-spacing-2);
}

.romantic-mobile-menu-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--romantic-spacing-3) var(--romantic-spacing-4);
  font-size: var(--romantic-font-size-base);
  text-decoration: none;
  color: var(--romantic-dark);
  font-weight: var(--romantic-font-weight-medium);
  border-radius: var(--romantic-radius);
  transition: var(--romantic-transition), opacity 0.3s ease;
  position: relative;
  white-space: nowrap;
  min-height: 48px;
  opacity: 0.9;
  line-height: 1;
}

.romantic-mobile-menu-link:hover {
  color: var(--romantic-primary);
  background: var(--romantic-light);
  opacity: 1;
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
  bottom: -5px;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--romantic-primary);
  border-radius: 3px;
}

.romantic-mobile-logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--romantic-spacing-3) var(--romantic-spacing-4);
  font-size: var(--romantic-font-size-base);
  background: none;
  border: none;
  color: var(--romantic-dark);
  font-weight: var(--romantic-font-weight-medium);
  border-radius: var(--romantic-radius);
  transition: var(--romantic-transition);
  cursor: pointer;
  white-space: nowrap;
  min-height: 48px;
  line-height: 1;
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
  
  /* 当桌面端菜单项过多时，也可以水平滚动 */
  .romantic-desktop-menu-scroll {
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    padding: 0 var(--romantic-spacing-4);
    margin: 0 calc(var(--romantic-spacing-4) * -1);
    gap: var(--romantic-spacing-4);
  }
  
  .romantic-desktop-menu-scroll::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
  
  .romantic-desktop-menu-scroll li {
    flex: 0 0 auto;
  }
}
</style>

<template>
  <nav class="romantic-navigation" :style="{ opacity: navbarOpacity }">
    <div class="romantic-navigation-container">
      <div>
        <RouterLink 
          to="/" 
          @click="closeMenu"
          class="romantic-logo-link"
        >
          ❤️ Love Story for Us
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
          <li v-if="userStore.user?.isAdmin">
            <RouterLink 
              to="/admin" 
              @click="closeMenu"
              class="romantic-menu-link"
              active-class="romantic-menu-link-active"
            >
              管理
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
    <div 
      class="romantic-mobile-menu"
      :class="{ 'romantic-mobile-menu-open': isMenuOpen, 'romantic-mobile-menu-closed': !isMenuOpen }"
    >
      <div class="romantic-mobile-menu-items">
        <div class="romantic-mobile-menu-item">
          <RouterLink 
            to="/" 
            @click="closeMenu"
            class="romantic-mobile-menu-link"
            active-class="romantic-mobile-menu-link-active"
          >
            首页
          </RouterLink>
        </div>
        <div class="romantic-mobile-menu-item">
          <RouterLink 
            to="/memories" 
            @click="closeMenu"
            class="romantic-mobile-menu-link"
            active-class="romantic-mobile-menu-link-active"
          >
            回忆
          </RouterLink>
        </div>
        <div class="romantic-mobile-menu-item">
          <RouterLink 
            to="/photos" 
            @click="closeMenu"
            class="romantic-mobile-menu-link"
            active-class="romantic-mobile-menu-link-active"
          >
            相册
          </RouterLink>
        </div>
        <div class="romantic-mobile-menu-item">
          <RouterLink 
            to="/anniversaries" 
            @click="closeMenu"
            class="romantic-mobile-menu-link"
            active-class="romantic-menu-link-active"
          >
            纪念日
          </RouterLink>
        </div>
        <div class="romantic-mobile-menu-item">
          <RouterLink 
            to="/about" 
            @click="closeMenu"
            class="romantic-mobile-menu-link"
            active-class="romantic-mobile-menu-link-active"
          >
            关于
          </RouterLink>
        </div>

        <template v-if="!userStore.isLoggedIn">
          <div class="romantic-mobile-menu-item">
            <RouterLink 
              to="/login" 
              @click="closeMenu"
              class="romantic-mobile-menu-link"
              active-class="romantic-mobile-menu-link-active"
            >
              登录
            </RouterLink>
          </div>
        </template>
        <template v-else>
          <div class="romantic-mobile-menu-item">
            <RouterLink 
              to="/profile" 
              @click="closeMenu"
              class="romantic-mobile-menu-link"
              active-class="romantic-mobile-menu-link-active"
            >
              用户
            </RouterLink>
          </div>
          <div v-if="userStore.user?.isAdmin" class="romantic-mobile-menu-item">
            <RouterLink 
              to="/admin" 
              @click="closeMenu"
              class="romantic-mobile-menu-link"
              active-class="romantic-mobile-menu-link-active"
            >
              管理
            </RouterLink>
          </div>
          <div class="romantic-mobile-menu-item">
            <button 
              @click="logout" 
              class="romantic-mobile-logout-button"
            >
              退出
            </button>
          </div>
        </template>
      </div>
    </div>
  </nav>
</template>