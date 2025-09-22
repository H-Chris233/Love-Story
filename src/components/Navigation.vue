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

<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-logo">
        <RouterLink to="/" @click="closeMenu">❤️ Love Story</RouterLink>
      </div>
      
      <!-- 桌面端导航菜单 -->
      <ul class="nav-menu desktop-menu">
        <li class="nav-item">
          <RouterLink to="/" @click="closeMenu" active-class="active">首页</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/memories" @click="closeMenu" active-class="active">回忆</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/photos" @click="closeMenu" active-class="active">相册</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/anniversaries" @click="closeMenu" active-class="active">纪念日</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/about" @click="closeMenu" active-class="active">关于</RouterLink>
        </li>
        <template v-if="!userStore.isLoggedIn">
          <li class="nav-item">
            <RouterLink to="/login" @click="closeMenu" active-class="active">登录</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/register" @click="closeMenu" active-class="active">注册</RouterLink>
          </li>
        </template>
        <template v-else>
          <li class="nav-item">
            <button @click="logout" class="logout-button">退出</button>
          </li>
        </template>
      </ul>
      
      <!-- 移动端菜单按钮 -->
      <div class="nav-toggle" @click="toggleMenu">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </div>
    </div>
    
    <!-- 移动端导航菜单 -->
    <ul class="nav-menu mobile-menu" :class="{ 'active': isMenuOpen }">
      <li class="nav-item">
        <RouterLink to="/" @click="closeMenu" active-class="active">首页</RouterLink>
      </li>
      <li class="nav-item">
        <RouterLink to="/memories" @click="closeMenu" active-class="active">回忆</RouterLink>
      </li>
      <li class="nav-item">
        <RouterLink to="/photos" @click="closeMenu" active-class="active">相册</RouterLink>
      </li>
      <li class="nav-item">
        <RouterLink to="/anniversaries" @click="closeMenu" active-class="active">纪念日</RouterLink>
      </li>
      <li class="nav-item">
        <RouterLink to="/about" @click="closeMenu" active-class="active">关于</RouterLink>
      </li>
      <template v-if="!userStore.isLoggedIn">
        <li class="nav-item">
          <RouterLink to="/login" @click="closeMenu" active-class="active">登录</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/register" @click="closeMenu" active-class="active">注册</RouterLink>
        </li>
      </template>
      <template v-else>
        <li class="nav-item">
          <button @click="logout" class="logout-button">退出</button>
        </li>
      </template>
    </ul>
  </nav>
</template>

<style scoped>
.navbar {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.nav-logo a {
  font-size: 1.8rem;
  font-weight: 800;
  color: #ec4899; /* pink-500 */
  text-decoration: none;
  transition: color 0.3s ease;
}

.nav-logo a:hover {
  color: #db2777; /* pink-600 */
}

.nav-menu {
  display: flex;
  list-style: none;
}

.desktop-menu {
  gap: 2rem;
}

.nav-item a {
  text-decoration: none;
  color: #4b5563; /* gray-600 */
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
}

.nav-item a:hover {
  color: #ec4899; /* pink-500 */
  background: #fdf2f8; /* pink-50 */
}

.nav-item a.active {
  color: #ec4899; /* pink-500 */
  background: #fdf2f8; /* pink-50 */
}

/* 活跃链接底部指示器 */
.nav-item a.active::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 3px;
  background: #ec4899; /* pink-500 */
  border-radius: 3px;
}

.logout-button {
  background: none;
  border: none;
  color: #4b5563; /* gray-600 */
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.logout-button:hover {
  color: #ef4444; /* red-500 */
  background: #fef2f2; /* red-50 */
}

.nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 21px;
  cursor: pointer;
}

.bar {
  height: 3px;
  width: 100%;
  background-color: #ec4899; /* pink-500 */
  border-radius: 10px;
  transition: all 0.3s ease;
}

/* 移动端菜单样式 */
.mobile-menu {
  display: none;
}

/* 平板及以下设备 */
@media (max-width: 1024px) {
  .nav-container {
    padding: 0 1rem;
  }
  
  .desktop-menu {
    gap: 1.5rem;
  }
  
  .nav-item a {
    font-size: 0.95rem;
    padding: 0.4rem 0.8rem;
  }
  
  .nav-logo a {
    font-size: 1.6rem;
  }
}

/* 手机横屏及以下设备 */
@media (max-width: 768px) {
  .desktop-menu {
    display: none;
  }
  
  .nav-toggle {
    display: flex;
  }
  
  .nav-toggle.active .bar:nth-child(2) {
    opacity: 0;
  }
  
  .nav-toggle.active .bar:nth-child(1) {
    transform: translateY(9px) rotate(45deg);
  }
  
  .nav-toggle.active .bar:nth-child(3) {
    transform: translateY(-9px) rotate(-45deg);
  }
  
  .mobile-menu {
    position: absolute;
    top: 70px;
    left: 0;
    width: 100%;
    background: white;
    flex-direction: column;
    align-items: center;
    padding: 1rem 0;
    box-shadow: 0 10px 10px rgba(0, 0, 0, 0.1);
    transform: translateY(-150%);
    transition: transform 0.3s ease;
    z-index: 999;
  }
  
  .mobile-menu.active {
    transform: translateY(0);
    display: flex;
  }
  
  .mobile-menu .nav-item {
    width: 100%;
    text-align: center;
    margin: 0.25rem 0;
  }
  
  .mobile-menu .nav-item a {
    display: block;
    padding: 1rem;
    font-size: 1.1rem;
    border-radius: 0;
  }
  
  .nav-container {
    height: 65px;
  }
  
  .nav-logo a {
    font-size: 1.5rem;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .nav-container {
    padding: 0 0.75rem;
  }
  
  .nav-logo a {
    font-size: 1.4rem;
  }
  
  .mobile-menu .nav-item a {
    font-size: 1rem;
    padding: 0.8rem;
  }
}

/* 超小屏手机 */
@media (max-width: 360px) {
  .nav-container {
    padding: 0 0.5rem;
  }
  
  .nav-logo a {
    font-size: 1.3rem;
  }
  
  .mobile-menu .nav-item a {
    font-size: 0.95rem;
    padding: 0.7rem;
  }
}
</style>