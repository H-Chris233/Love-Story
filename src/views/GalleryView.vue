<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { api } from '@/services/api'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import type { GalleryItem } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const photos = ref<GalleryItem[]>([])
const nextCursor = ref<string | null>(null)
const moreLoading = ref(false)
const moreError = ref('')
const { load, loading, loadError } = useLoad(async () => {
  const page = await api.gallery()
  photos.value = page.items
  nextCursor.value = page.nextCursor
  moreError.value = ''
})
async function loadMore() {
  if (!nextCursor.value || moreLoading.value) return
  moreLoading.value = true
  moreError.value = ''
  try {
    const page = await api.gallery(nextCursor.value)
    photos.value.push(...page.items)
    nextCursor.value = page.nextCursor
  } catch {
    moreError.value = '暂时无法加载更多照片'
  } finally {
    moreLoading.value = false
  }
}
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
        <img
          :src="photo.asset.url"
          :alt="photo.asset.originalName"
          loading="lazy"
          decoding="async"
        />
        <figcaption>
          {{ photo.memoryTitle }} · {{ formatShanghaiDate(photo.occurredOn) }}
        </figcaption>
      </figure>
    </div>
    <div v-else-if="!loading && !loadError" class="card empty">
      <h3>还没有照片</h3>
      <p>在回忆页面添加照片后，它们会自动出现在这里。</p>
      <RouterLink class="button button--secondary" to="/app/memories">去写回忆</RouterLink>
    </div>
    <div v-if="nextCursor || moreError" class="stack" style="justify-items: center">
      <p v-if="moreError" class="form-error" role="alert">{{ moreError }}</p>
      <button
        class="button button--secondary"
        type="button"
        :disabled="moreLoading"
        @click="loadMore"
      >
        {{ moreLoading ? '加载中…' : moreError ? '重试加载' : '加载更多' }}
      </button>
    </div>
  </div>
</template>
