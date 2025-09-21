<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navigation from './components/Navigation.vue'
</script>

<template>
  <div class="app-container">
    <Navigation />
    <RouterView />
  </div>
</template>

<style>
/* 全局样式，确保响应式设计 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f4f4f4;
}

/* 响应式设计 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 移动设备优先 */
@media (max-width: 768px) {
  .container {
    padding: 0 10px;
  }
}

/* 平板设备 */
@media (min-width: 769px) and (max-width: 1024px) {
  .container {
    padding: 0 15px;
  }
}

/* 桌面设备 */
@media (min-width: 1025px) {
  .container {
    padding: 0 20px;
  }
}

.app-container {
  min-height: 100vh;
}
</style>
