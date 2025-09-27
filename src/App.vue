<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navigation from './components/Navigation.vue'
import { useUserStore } from './stores/user'
import { onMounted } from 'vue'
import { SpeedInsights } from '@vercel/speed-insights/vue';
import { Analytics } from '@vercel/analytics/vue';

// Initialize user store
const userStore = useUserStore()

// Check if user is logged in on app start
onMounted(() => {
  if (userStore.token) {
    userStore.fetchUserProfile()
  }
})

// Also check on route changes to ensure user info is always available
import { useRouter } from 'vue-router'
const router = useRouter()
router.afterEach(() => {
  if (userStore.token && !userStore.user) {
    userStore.fetchUserProfile()
  }
})
</script>

<template>
  <div class="app-container">
    <Navigation />
    <RouterView />
    <SpeedInsights />
    <Analytics />
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
  background: var(--romantic-gradient);
}

/* 全局样式已移至增强版浪漫主题 */
</style>
