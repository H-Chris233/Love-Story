<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { ApiError, api } from '@/services/api'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import { useSessionStore } from '@/stores/session'
import { isoToShanghaiLocal, shanghaiLocalToIso } from '@/utils/date'

const session = useSessionStore()
const form = reactive({ title: '', intro: '', relationshipStartedAt: '' })
const partnerEmail = ref('')
const message = ref('')
const error = ref('')
const busy = ref(false)

const { load, loading, loadError } = useLoad(async () => {
  const story = await api.story()
  form.title = story.space.title
  form.intro = story.space.intro
  form.relationshipStartedAt = isoToShanghaiLocal(story.space.relationshipStartedAt)
})
onMounted(load)
async function save() {
  busy.value = true
  error.value = ''
  try {
    const space = await api.updateSettings({
      title: form.title,
      intro: form.intro,
      relationshipStartedAt: shanghaiLocalToIso(form.relationshipStartedAt)
    })
    if (session.current) session.current.space = space
    message.value = '空间资料已保存。'
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '暂时无法保存设置'
  } finally {
    busy.value = false
  }
}
async function invite() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    const result = await api.invitePartner(partnerEmail.value)
    message.value =
      result.invitationDelivery === 'sent'
        ? '邀请邮件已发送。'
        : '邀请已生成，但邮件发送失败，请稍后重试。'
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '暂时无法发送邀请'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Settings</p>
        <h1>空间设置</h1>
        <p class="lede">两位成员拥有完全相同的内容权限。</p>
      </div>
    </header>
    <p v-if="message" class="notice" role="status">{{ message }}</p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <LoadState :loading="loading" :error="loadError" @retry="load" />
    <form v-if="!loading && !loadError" class="card card-pad stack" @submit.prevent="save">
      <h2>故事资料</h2>
      <div class="field">
        <label for="settings-title">故事标题</label
        ><input id="settings-title" v-model="form.title" required />
      </div>
      <div class="field">
        <label for="settings-intro">故事短句</label
        ><textarea id="settings-intro" v-model="form.intro" />
      </div>
      <div class="field">
        <label for="settings-start">恋爱开始时间（北京时间）</label
        ><input
          id="settings-start"
          v-model="form.relationshipStartedAt"
          type="datetime-local"
          required
        />
      </div>
      <div><button class="button" :disabled="busy" type="submit">保存设置</button></div>
    </form>
    <form class="card card-pad stack" @submit.prevent="invite">
      <h2>伴侣邀请</h2>
      <p class="muted">旧邀请会失效，新链接有效 7 天且只能使用一次。</p>
      <div class="field">
        <label for="settings-partner">伴侣邮箱</label
        ><input id="settings-partner" v-model="partnerEmail" type="email" required />
      </div>
      <div>
        <button class="button button--secondary" :disabled="busy" type="submit">
          重新生成并发送邀请
        </button>
      </div>
    </form>
  </div>
</template>
