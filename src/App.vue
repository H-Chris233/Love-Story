<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()
const links = [
  { to: '/app', label: '总览', icon: '⌂' },
  { to: '/app/memories', label: '回忆', icon: '✦' },
  { to: '/app/gallery', label: '相册', icon: '▧' },
  { to: '/app/anniversaries', label: '纪念日', icon: '○' },
  { to: '/app/settings', label: '设置', icon: '⚙' }
]
const privateArea = computed(() => router.currentRoute.value.meta.requiresAuth === true)

async function logout() {
  await session.logout()
  await router.push('/')
}
</script>

<template>
  <div :class="['app-shell', { 'app-shell--private': privateArea }]">
    <header v-if="privateArea" class="site-header">
      <RouterLink class="brand" to="/app" aria-label="返回总览">
        <span class="brand__mark" aria-hidden="true">L</span>
        <span>Love Story</span>
      </RouterLink>
      <nav class="desktop-nav" aria-label="主导航">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</RouterLink>
      </nav>
      <button class="text-button" type="button" @click="logout">退出</button>
    </header>

    <main :class="{ 'private-main': privateArea }">
      <RouterView />
    </main>

    <nav v-if="privateArea" class="mobile-nav" aria-label="移动端主导航">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to">
        <span aria-hidden="true">{{ link.icon }}</span>
        <span>{{ link.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
