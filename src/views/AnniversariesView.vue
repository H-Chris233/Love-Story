<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import VisibilityField from '@/components/VisibilityField.vue'
import { ApiError, api } from '@/services/api'
import type { AnniversaryEntry } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const anniversaries = ref<AnniversaryEntry[]>([])
const form = reactive({ title: '', originalDate: '', reminderDays: 7, isPublic: false })
const error = ref('')
const busy = ref(false)

async function load() {
  anniversaries.value = await api.anniversaries()
}
async function submit() {
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
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '暂时无法保存纪念日'
  } finally {
    busy.value = false
  }
}
async function toggle(item: AnniversaryEntry) {
  if (item.visibility === 'private' && !window.confirm('公开后，访客可以看到这个纪念日。继续吗？'))
    return
  await api.updateAnniversary(item.id, {
    visibility: item.visibility === 'public' ? 'private' : 'public'
  })
  await load()
}
async function remove(item: AnniversaryEntry) {
  if (!window.confirm(`确定删除「${item.title}」吗？`)) return
  await api.deleteAnniversary(item.id)
  await load()
}
onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Anniversaries</p>
        <h1>纪念日</h1>
        <p class="lede">每天北京时间 07:00 检查提前提醒和当天提醒。</p>
      </div>
    </header>
    <form class="card card-pad stack" @submit.prevent="submit">
      <h2>记住一个日子</h2>
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
    <section class="stack">
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
          <button class="button button--secondary" type="button" @click="toggle(item)">
            {{ item.visibility === 'public' ? '改回私密' : '公开' }}</button
          ><button class="button button--danger" type="button" @click="remove(item)">删除</button>
        </div>
      </article>
      <div v-if="!anniversaries.length" class="card empty">
        <h3>还没有纪念日</h3>
        <p>那些值得每年期待的日子，会在这里等你们。</p>
      </div>
    </section>
  </div>
</template>
