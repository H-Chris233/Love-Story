<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { api } from '@/services/api'
import type { StoryView } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const story = ref<StoryView | null>(null)
const photos = computed(() =>
  (story.value?.memories ?? []).flatMap((memory) =>
    memory.assets.map((asset) => ({ asset, memory }))
  )
)
onMounted(async () => (story.value = await api.story()))
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Gallery</p>
        <h1>照片相册</h1>
        <p class="lede">相册直接来自回忆中的照片，没有第二套数据源。</p>
      </div>
    </header>
    <div v-if="photos.length" class="gallery">
      <figure v-for="photo in photos" :key="photo.asset.id">
        <img :src="photo.asset.url" :alt="photo.asset.originalName" />
        <figcaption>
          {{ photo.memory.title }} · {{ formatShanghaiDate(photo.memory.occurredOn) }}
        </figcaption>
      </figure>
    </div>
    <div v-else class="card empty">
      <h3>还没有照片</h3>
      <p>在回忆页面添加照片后，它们会自动出现在这里。</p>
      <RouterLink class="button button--secondary" to="/app/memories">去写回忆</RouterLink>
    </div>
  </div>
</template>
