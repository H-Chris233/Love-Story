<script setup lang="ts">
import { watch, ref } from 'vue'
import { useRoute } from 'vue-router'

import { api, ApiError } from '@/services/api'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import type { MemoryEntry } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const route = useRoute()
const memory = ref<MemoryEntry | null>(null)
const error = ref('')

const { load, loading, loadError } = useLoad(async () => {
  error.value = ''
  memory.value = null
  try {
    memory.value = await api.publicMemory(String(route.params.slug))
  } catch (reason) {
    if (!(reason instanceof ApiError) || reason.status !== 404) throw reason
    error.value = '这条回忆不存在，或已经改回私密。'
  }
})
watch(() => route.params.slug, load, { immediate: true })
</script>

<template>
  <main class="public-content page" style="padding-top: 70px">
    <RouterLink to="/" class="muted">← 返回故事</RouterLink>
    <LoadState :loading="loading" :error="loadError" @retry="load" />
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
  </main>
</template>
