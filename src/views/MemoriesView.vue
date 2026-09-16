<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import VisibilityField from '@/components/VisibilityField.vue'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import { useNotificationStore } from '@/stores/notification'
import { ApiError, api } from '@/services/api'
import type { MemoryEntry } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const memories = ref<MemoryEntry[]>([])
const nextCursor = ref<string | null>(null)
const moreLoading = ref(false)
const moreError = ref('')
const busy = ref(false)
const error = ref('')
const fields = ref<Record<string, string>>({})
const selectedFiles = ref<File[]>([])
const previews = ref<Array<{ name: string; url: string }>>([])
const form = reactive({ title: '', body: '', occurredOn: '', isPublic: false })
const editing = ref<string | null>(null)
const draft = reactive({ title: '', body: '', occurredOn: '' })
const notification = useNotificationStore()

function edit(memory: MemoryEntry) {
  if (busy.value) return
  editing.value = memory.id
  Object.assign(draft, { title: memory.title, body: memory.body, occurredOn: memory.occurredOn })
}
async function act(action: () => Promise<unknown>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await action()
    await load()
  } catch (reason) {
    notification.show(reason instanceof ApiError ? reason.message : '操作失败，请重试', 'error')
  } finally {
    busy.value = false
  }
}
async function saveEdit(id: string) {
  await act(async () => {
    await api.updateMemory(id, { ...draft })
    editing.value = null
  })
}
async function uploadFiles(memoryId: string, files: File[]) {
  let failed = 0
  for (const file of files) {
    try {
      await api.uploadMemoryImage(memoryId, file)
    } catch {
      failed++
    }
  }
  if (failed) notification.show('部分照片失败，可继续补传。回忆和成功上传的照片已保存。', 'warning')
}
async function addPhotos(memory: MemoryEntry, event: Event) {
  if (busy.value) return
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? []).slice(0, 10 - memory.assets.length)
  await act(() => uploadFiles(memory.id, files))
  input.value = ''
}
async function removePhoto(id: string) {
  if (busy.value) return
  if (window.confirm('确定删除这张照片吗？')) await act(() => api.deleteAsset(id))
}

const { load, loading, loadError } = useLoad(async () => {
  const page = await api.memories()
  memories.value = page.items
  nextCursor.value = page.nextCursor
  moreError.value = ''
})

async function loadMore() {
  if (!nextCursor.value || moreLoading.value) return
  moreLoading.value = true
  moreError.value = ''
  try {
    const page = await api.memories(nextCursor.value)
    memories.value.push(...page.items)
    nextCursor.value = page.nextCursor
  } catch (reason) {
    moreError.value = reason instanceof ApiError ? reason.message : '暂时无法加载更多回忆'
  } finally {
    moreLoading.value = false
  }
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
  if (busy.value) return
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
    await uploadFiles(memory.id, selectedFiles.value)
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
  if (busy.value) return
  if (
    memory.visibility === 'private' &&
    !window.confirm('公开后，访客可以看到这条回忆及其中照片。继续吗？')
  )
    return
  await act(() =>
    api.updateMemory(memory.id, {
      visibility: memory.visibility === 'public' ? 'private' : 'public'
    })
  )
}

async function remove(memory: MemoryEntry) {
  if (busy.value) return
  if (!window.confirm(`确定删除「${memory.title}」吗？`)) return
  await act(() => api.deleteMemory(memory.id))
}

onMounted(load)
onBeforeUnmount(() => previews.value.forEach(({ url }) => URL.revokeObjectURL(url)))
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <h1>我们的回忆</h1>
      </div>
    </header>

    <form class="card card-pad stack" @submit.prevent="submit">
      <h2>写一条回忆</h2>
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
            decoding="async"
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
      <LoadState :loading="loading" :error="loadError" @retry="load" />
      <div class="page-heading">
        <h2>所有回忆</h2>
        <span class="muted">{{ memories.length }} 条</span>
      </div>
      <div v-if="memories.length" class="grid grid--2">
        <article v-for="memory in memories" :key="memory.id" class="card memory-card">
          <div class="grid grid--2">
            <figure v-for="asset in memory.assets" :key="asset.id">
              <img
                class="memory-card__photo"
                :src="asset.url"
                :alt="asset.originalName"
                loading="lazy"
                decoding="async"
              />
              <button
                type="button"
                class="button button--danger"
                :disabled="busy"
                :aria-label="`删除照片 ${asset.originalName}`"
                @click="removePhoto(asset.id)"
              >
                删除照片
              </button>
            </figure>
          </div>
          <div class="memory-card__body stack">
            <form v-if="editing === memory.id" class="stack" @submit.prevent="saveEdit(memory.id)">
              <label class="field"
                >编辑标题<input v-model="draft.title" required maxlength="160"
              /></label>
              <label class="field"
                >编辑日期<input v-model="draft.occurredOn" type="date" required
              /></label>
              <label class="field">编辑故事<textarea v-model="draft.body" required /></label>
              <div class="cluster">
                <button class="button" :disabled="busy" type="submit">保存修改</button
                ><button
                  class="button button--secondary"
                  :disabled="busy"
                  type="button"
                  @click="editing = null"
                >
                  取消
                </button>
              </div>
            </form>
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
                :disabled="busy"
                type="button"
                @click="edit(memory)"
              >
                编辑回忆
              </button>
              <button
                class="button button--secondary"
                type="button"
                :disabled="busy"
                @click="toggleVisibility(memory)"
              >
                {{ memory.visibility === 'public' ? '改回私密' : '公开' }}
              </button>
              <button
                class="button button--danger"
                :disabled="busy"
                type="button"
                @click="remove(memory)"
              >
                删除
              </button>
            </div>
            <label v-if="memory.assets.length < 10" class="field"
              >补传照片（还可添加 {{ 10 - memory.assets.length }} 张）<input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                :disabled="busy"
                @change="addPhotos(memory, $event)"
            /></label>
          </div>
        </article>
      </div>
      <div v-else-if="!loading && !loadError" class="card empty">
        <h3>时间线还是空白</h3>
      </div>
      <div v-if="nextCursor || moreError" class="stack" style="justify-items: center">
        <p v-if="moreError" class="form-error" role="alert">{{ moreError }}</p>
        <button
          class="button button--secondary"
          type="button"
          :disabled="moreLoading || busy"
          @click="loadMore"
        >
          {{ moreLoading ? '加载中…' : moreError ? '重试加载' : '加载更多' }}
        </button>
      </div>
    </section>
  </div>
</template>
