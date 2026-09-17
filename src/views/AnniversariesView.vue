<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import VisibilityField from '@/components/VisibilityField.vue'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import { useNotificationStore } from '@/stores/notification'
import { ApiError, api } from '@/services/api'
import type { AnniversaryEntry } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const anniversaries = ref<AnniversaryEntry[]>([])
const composer = ref<HTMLDialogElement | null>(null)
const form = reactive({ title: '', originalDate: '', reminderDays: 7, isPublic: false })
const error = ref('')
const notification = useNotificationStore()
const busy = ref(false)
const editing = ref<string | null>(null)
const draft = reactive({ title: '', originalDate: '', reminderDays: 7 })
function openComposer() {
  if (!busy.value && composer.value && !composer.value.open) composer.value.showModal()
}
function closeComposer() {
  if (!busy.value && composer.value?.open) composer.value.close()
}
function cancelComposer(event: Event) {
  if (busy.value) event.preventDefault()
}
function edit(item: AnniversaryEntry) {
  if (busy.value) return
  editing.value = item.id
  Object.assign(draft, {
    title: item.title,
    originalDate: item.originalDate,
    reminderDays: item.reminderDays
  })
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
    await api.updateAnniversary(id, { ...draft })
    editing.value = null
  })
}

const { load, loading, loadError } = useLoad(async () => {
  anniversaries.value = await api.anniversaries()
})
async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await api.createAnniversary({
      title: form.title,
      originalDate: form.originalDate,
      reminderDays: form.reminderDays,
      visibility: form.isPublic ? 'public' : 'private'
    })
    Object.assign(form, { title: '', originalDate: '', reminderDays: 7, isPublic: false })
    await load()
    if (composer.value?.open) composer.value.close()
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '暂时无法保存纪念日'
  } finally {
    busy.value = false
  }
}
async function toggle(item: AnniversaryEntry) {
  if (busy.value) return
  if (item.visibility === 'private' && !window.confirm('公开后，访客可以看到这个纪念日。继续吗？'))
    return
  await act(() =>
    api.updateAnniversary(item.id, {
      visibility: item.visibility === 'public' ? 'private' : 'public'
    })
  )
}
async function remove(item: AnniversaryEntry) {
  if (busy.value) return
  if (!window.confirm(`确定删除「${item.title}」吗？`)) return
  await act(() => api.deleteAnniversary(item.id))
}
onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <h1>纪念日</h1>
      </div>
      <button class="button" type="button" :disabled="busy" @click="openComposer">
        <span aria-hidden="true">＋</span> 记纪念日
      </button>
    </header>
    <dialog
      ref="composer"
      class="entry-composer"
      aria-labelledby="anniversary-composer-title"
      @cancel="cancelComposer"
    >
      <form class="entry-composer__form stack" @submit.prevent="submit">
        <header class="entry-composer__header">
          <h2 id="anniversary-composer-title">记住一个日子</h2>
          <button
            class="entry-composer__close"
            type="button"
            :disabled="busy"
            aria-label="关闭纪念日弹窗"
            @click="closeComposer"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="grid grid--3">
          <div class="field">
            <label for="anniversary-title">名称</label
            ><input id="anniversary-title" v-model="form.title" required />
          </div>
          <div class="field">
            <label for="anniversary-date">最初日期</label
            ><input id="anniversary-date" v-model="form.originalDate" type="date" required />
          </div>
          <div class="field">
            <label for="reminder-days">提前提醒天数</label
            ><input
              id="reminder-days"
              v-model.number="form.reminderDays"
              type="number"
              min="0"
              max="365"
              required
            />
          </div>
        </div>
        <VisibilityField v-model="form.isPublic" />
        <div><button class="button" :disabled="busy" type="submit">保存纪念日</button></div>
      </form>
    </dialog>
    <section class="stack">
      <LoadState :loading="loading" :error="loadError" @retry="load" />
      <article v-for="item in anniversaries" :key="item.id" class="card anniversary-row">
        <div class="anniversary-row__date">{{ item.originalDate.slice(5).replace('-', '.') }}</div>
        <div>
          <div class="cluster">
            <h3>{{ item.title }}</h3>
            <span :class="['badge', { 'badge--public': item.visibility === 'public' }]">{{
              item.visibility === 'public' ? '已公开' : '私密'
            }}</span>
          </div>
          <p class="muted">
            始于 {{ formatShanghaiDate(item.originalDate) }} · 提前 {{ item.reminderDays }} 天提醒
          </p>
        </div>
        <div class="cluster">
          <button
            v-if="editing !== item.id"
            class="button button--secondary"
            type="button"
            :disabled="busy"
            @click="edit(item)"
          >
            编辑纪念日
          </button>
          <template v-else>
            <button
              class="button button--secondary"
              type="button"
              :disabled="busy"
              @click="toggle(item)"
            >
              {{ item.visibility === 'public' ? '改回私密' : '公开' }}</button
            ><button
              class="button button--danger"
              type="button"
              :disabled="busy"
              @click="remove(item)"
            >
              删除
            </button>
          </template>
        </div>
        <form v-if="editing === item.id" class="stack" @submit.prevent="saveEdit(item.id)">
          <label class="field"
            >编辑名称<input v-model="draft.title" required maxlength="160"
          /></label>
          <label class="field"
            >编辑最初日期<input v-model="draft.originalDate" type="date" required
          /></label>
          <label class="field"
            >编辑提前提醒天数<input
              v-model.number="draft.reminderDays"
              type="number"
              min="0"
              max="365"
              required
          /></label>
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
      </article>
      <div v-if="!anniversaries.length && !loading && !loadError" class="card empty">
        <h3>还没有纪念日</h3>
      </div>
    </section>
  </div>
</template>
