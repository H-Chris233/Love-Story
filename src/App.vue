<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useSessionStore } from '@/stores/session'
import NotificationToast from '@/components/NotificationToast.vue'
import { useNotificationStore } from '@/stores/notification'

const session = useSessionStore()
const router = useRouter()
const notification = useNotificationStore()
const busy = ref(false)
async function retrySession() {
  if (busy.value) return
  busy.value = true
  try {
    await session.ensureLoaded()
    if (!session.error) await router.replace(window.location.pathname + window.location.search)
  } finally {
    busy.value = false
  }
}
const links = [
  { to: '/app', label: '我们', icon: '♡' },
  { to: '/app/memories', label: '回忆', icon: '✎' },
  { to: '/app/gallery', label: '相册', icon: '▧' },
  { to: '/app/anniversaries', label: '纪念日', icon: '○' },
  { to: '/app/settings', label: '设置', icon: '⚙' }
]
const privateArea = computed(() => router.currentRoute.value.meta.requiresAuth === true)
const sessionArea = computed(
  () => privateArea.value || router.currentRoute.value.meta.guestOnly === true
)

async function logout() {
  if (busy.value) return
  busy.value = true
  try {
    await session.logout()
    await router.push('/')
  } catch {
    notification.show('退出失败，请重试', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <NotificationToast />
  <div :class="['app-shell', { 'app-shell--private': privateArea }]">
    <header v-if="privateArea" class="site-header">
      <RouterLink class="brand" to="/app" aria-label="返回我们的首页">
        <span class="brand__mark" aria-hidden="true">♥</span>
        <span>Love Story</span>
      </RouterLink>
      <nav class="desktop-nav" aria-label="主导航">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to">
          <span aria-hidden="true">{{ link.icon }}</span
          >{{ link.label }}
        </RouterLink>
      </nav>
      <button class="text-button" type="button" :disabled="busy" @click="logout">退出</button>
    </header>

    <main :class="{ 'private-main': privateArea }">
      <div v-if="sessionArea && session.error" role="alert" class="card card-pad">
        <p>{{ session.error }}</p>
        <button type="button" class="button" :disabled="busy" @click="retrySession">重试</button>
      </div>
      <RouterView v-else />
    </main>

    <nav v-if="privateArea" class="mobile-nav" aria-label="移动端主导航">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to">
        <span aria-hidden="true">{{ link.icon }}</span>
        <span>{{ link.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
