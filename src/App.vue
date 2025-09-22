<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navigation from './components/Navigation.vue'
import { useUserStore } from './stores/user'
import { onMounted } from 'vue'

// Initialize user store
const userStore = useUserStore()

// Check if user is logged in on app start
onMounted(() => {
  if (userStore.token) {
    userStore.fetchUserProfile()
  }
})
</script>

<template>
  <div class="app-container">
    <Navigation />
    <RouterView />
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
  background: var(--romantic-gradient);
}

/* 全局样式已移至Tailwind CSS */
</style>
