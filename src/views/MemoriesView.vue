<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import VisibilityField from '@/components/VisibilityField.vue'
import { ApiError, api } from '@/services/api'
import type { MemoryEntry } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const memories = ref<MemoryEntry[]>([])
const busy = ref(false)
const error = ref('')
const fields = ref<Record<string, string>>({})
const selectedFiles = ref<File[]>([])
const previews = ref<Array<{ name: string; url: string }>>([])
const form = reactive({ title: '', body: '', occurredOn: '', isPublic: false })

async function load() {
  memories.value = await api.memories()
}

function chooseFiles(event: Event) {
  for (const preview of previews.value) URL.revokeObjectURL(preview.url)
  selectedFiles.value = Array.from((event.target as HTMLInputElement).files ?? []).slice(0, 10)
  previews.value = selectedFiles.value.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file)
  }))
}

async function submit() {
  busy.value = true
  error.value = ''
  fields.value = {}
  try {
    const memory = await api.createMemory({
      title: form.title,
      body: form.body,
      occurredOn: form.occurredOn,
      visibility: form.isPublic ? 'public' : 'private'
    })
    for (const file of selectedFiles.value) await api.uploadMemoryImage(memory.id, file)
    Object.assign(form, { title: '', body: '', occurredOn: '', isPublic: false })
    selectedFiles.value = []
    for (const preview of previews.value) URL.revokeObjectURL(preview.url)
    previews.value = []
    await load()
  } catch (reason) {
    if (reason instanceof ApiError) {
      error.value = reason.message
      fields.value = reason.fields ?? {}
    } else error.value = '暂时无法保存回忆'
  } finally {
    busy.value = false
  }
}

async function toggleVisibility(memory: MemoryEntry) {
  if (
    memory.visibility === 'private' &&
    !window.confirm('公开后，访客可以看到这条回忆及其中照片。继续吗？')
  )
    return
  await api.updateMemory(memory.id, {
    visibility: memory.visibility === 'public' ? 'private' : 'public'
  })
  await load()
}

async function remove(memory: MemoryEntry) {
  if (!window.confirm(`确定删除「${memory.title}」吗？`)) return
  await api.deleteMemory(memory.id)
  await load()
}

onMounted(load)
onBeforeUnmount(() => previews.value.forEach(({ url }) => URL.revokeObjectURL(url)))
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Memories</p>
        <h1>回忆时间线</h1>
        <p class="lede">新内容默认只对你们两个人可见。</p>
      </div>
    </header>

    <form class="card card-pad stack" @submit.prevent="submit">
      <h2>写下这一页</h2>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="grid grid--2">
        <div class="field">
          <label for="memory-title">标题</label
          ><input id="memory-title" v-model="form.title" required />
          <p v-if="fields.title" class="field-error">{{ fields.title }}</p>
        </div>
        <div class="field">
          <label for="memory-date">发生日期</label
          ><input id="memory-date" v-model="form.occurredOn" type="date" required />
        </div>
      </div>
      <div class="field">
        <label for="memory-body">故事</label
        ><textarea id="memory-body" v-model="form.body" required />
      </div>
      <div class="field">
        <label for="memory-images">照片（最多 10 张，每张不超过 5 MB）</label>
        <input
          id="memory-images"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          @change="chooseFiles"
        />
      </div>
      <div v-if="previews.length" class="grid grid--3" aria-label="照片预览">
        <figure
          v-for="preview in previews"
          :key="preview.url"
          class="card"
          style="overflow: hidden; margin: 0"
        >
          <img
            :src="preview.url"
            :alt="`${preview.name} 预览`"
            style="display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover"
          />
        </figure>
      </div>
      <VisibilityField v-model="form.isPublic" />
      <div>
        <button class="button" :disabled="busy" type="submit">
          {{ busy ? '保存中…' : '保存回忆' }}
        </button>
      </div>
    </form>

    <section class="page">
      <div class="page-heading">
        <h2>所有回忆</h2>
        <span class="muted">{{ memories.length }} 页</span>
      </div>
      <div v-if="memories.length" class="grid grid--2">
        <article v-for="memory in memories" :key="memory.id" class="card memory-card">
          <img
            v-if="memory.assets[0]"
            class="memory-card__photo"
            :src="memory.assets[0].url"
            :alt="memory.title"
          />
          <div class="memory-card__body stack">
            <div class="memory-card__meta">
              <span>{{ formatShanghaiDate(memory.occurredOn) }}</span
              ><span :class="['badge', { 'badge--public': memory.visibility === 'public' }]">{{
                memory.visibility === 'public' ? '已公开' : '仅两人可见'
              }}</span>
            </div>
            <h3>{{ memory.title }}</h3>
            <p style="white-space: pre-wrap">{{ memory.body }}</p>
            <div class="cluster">
              <button
                class="button button--secondary"
                type="button"
                @click="toggleVisibility(memory)"
              >
                {{ memory.visibility === 'public' ? '改回私密' : '公开' }}
              </button>
              <button class="button button--danger" type="button" @click="remove(memory)">
                删除
              </button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="card empty">
        <h3>时间线还是空白</h3>
        <p>从一件小事开始，也很好。</p>
      </div>
    </section>
  </div>
</template>
