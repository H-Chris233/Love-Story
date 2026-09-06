<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { api } from '@/services/api'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import type { StoryView } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const story = ref<StoryView | null>(null)
const photos = computed(() =>
  (story.value?.memories ?? []).flatMap((memory) =>
    memory.assets.map((asset) => ({ asset, memory }))
  )
)
const { load, loading, loadError } = useLoad(async () => (story.value = await api.story()))
onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <h1>我们的相册</h1>
      </div>
    </header>
    <LoadState :loading="loading" :error="loadError" @retry="load" />
    <div v-if="photos.length" class="gallery">
      <figure v-for="photo in photos" :key="photo.asset.id">
        <img :src="photo.asset.url" :alt="photo.asset.originalName" />
        <figcaption>
          {{ photo.memory.title }} · {{ formatShanghaiDate(photo.memory.occurredOn) }}
        </figcaption>
      </figure>
    </div>
    <div v-else-if="!loading && !loadError" class="card empty">
      <h3>还没有照片</h3>
      <p>在回忆页面添加照片后，它们会自动出现在这里。</p>
      <RouterLink class="button button--secondary" to="/app/memories">去写回忆</RouterLink>
    </div>
  </div>
</template>
