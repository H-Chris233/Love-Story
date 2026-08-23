<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { api } from '@/services/api'
import type { MemoryEntry } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const route = useRoute()
const memory = ref<MemoryEntry | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    memory.value = await api.publicMemory(String(route.params.slug))
  } catch {
    error.value = '这条回忆不存在，或已经改回私密。'
  }
})
</script>

<template>
  <main class="public-content page" style="padding-top: 70px">
    <RouterLink to="/" class="muted">← 返回故事</RouterLink>
    <div v-if="error" class="card empty">
      <h1>没有找到</h1>
      <p>{{ error }}</p>
    </div>
    <article v-else-if="memory" class="page">
      <header class="stack">
        <p class="eyebrow">{{ formatShanghaiDate(memory.occurredOn) }} · {{ memory.authorName }}</p>
        <h1>{{ memory.title }}</h1>
      </header>
      <div v-if="memory.assets.length" class="gallery">
        <figure v-for="asset in memory.assets" :key="asset.id">
          <img :src="asset.url" :alt="asset.originalName" />
        </figure>
      </div>
      <p style="white-space: pre-wrap">{{ memory.body }}</p>
    </article>
    <p v-else class="muted">正在翻页…</p>
  </main>
</template>
