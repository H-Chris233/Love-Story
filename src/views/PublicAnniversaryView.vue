<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { api } from '@/services/api'
import type { AnniversaryEntry } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const route = useRoute()
const anniversary = ref<AnniversaryEntry | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    anniversary.value = await api.publicAnniversary(String(route.params.slug))
  } catch {
    error.value = '这个纪念日不存在，或已经改回私密。'
  }
})
</script>

<template>
  <main class="public-hero">
    <div class="public-hero__inner stack">
      <RouterLink to="/" class="muted">← 返回故事</RouterLink>
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
      <p v-else class="muted">正在翻页…</p>
    </div>
  </main>
</template>
