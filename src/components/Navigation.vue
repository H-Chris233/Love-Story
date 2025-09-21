<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav>
    <div class="nav-container">
      <div class="logo">
        <RouterLink to="/">❤️ Love Story</RouterLink>
      </div>
      
      <ul class="nav-menu">
        <li class="nav-item">
          <RouterLink to="/">首页</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/memories">回忆</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/photos">相册</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/anniversaries">纪念日</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/about">关于</RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
nav {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.logo a {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ec4899; /* pink-500 */
  text-decoration: none;
}

.nav-menu {
  display: flex;
  list-style: none;
  gap: 1.5rem;
}

.nav-item a {
  text-decoration: none;
  color: #333;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: background 0.2s ease;
  font-weight: 500;
}

.nav-item a:hover {
  background: #f3f4f6; /* gray-100 */
}

.nav-item a.router-link-exact-active {
  color: #ec4899;
  background: #fdf2f8; /* pink-50 */
}

/* 响应式设计 */
@media (max-width: 768px) {
  .nav-menu {
    gap: 1rem;
  }
  
  .nav-item a {
    padding: 0.5rem;
    font-size: 0.9rem;
  }
  
  .logo a {
    font-size: 1.2rem;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .nav-container {
    padding: 0 0.5rem;
  }
  
  .logo a {
    font-size: 1.1rem;
  }
  
  .nav-menu {
    gap: 0.5rem;
  }
  
  .nav-item a {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
}
</style>