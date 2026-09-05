<script setup lang="ts">
import { watch, ref } from 'vue'
import { useRoute } from 'vue-router'

import { api, ApiError } from '@/services/api'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import type { AnniversaryEntry } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const route = useRoute()
const anniversary = ref<AnniversaryEntry | null>(null)
const error = ref('')

const { load, loading, loadError } = useLoad(async () => {
  error.value = ''
  anniversary.value = null
  try {
    anniversary.value = await api.publicAnniversary(String(route.params.slug))
  } catch (reason) {
    if (!(reason instanceof ApiError) || reason.status !== 404) throw reason
    error.value = '这个纪念日不存在，或已经改回私密。'
  }
})
watch(() => route.params.slug, load, { immediate: true })
</script>

<template>
  <main class="public-hero">
    <div class="public-hero__inner stack">
      <RouterLink to="/" class="muted">← 返回故事</RouterLink>
      <LoadState :loading="loading" :error="loadError" @retry="load" />
      <template v-if="anniversary">
        <p class="eyebrow">
          Anniversary · {{ anniversary.originalDate.slice(5).replace('-', '.') }}
        </p>
        <h1>{{ anniversary.title }}</h1>
        <p class="lede">
          始于 {{ formatShanghaiDate(anniversary.originalDate) }}，以后每一年都值得期待。
        </p>
      </template>
      <template v-else-if="error"
        ><h1>没有找到</h1>
        <p class="lede">{{ error }}</p></template
      >
    </div>
  </main>
</template>
