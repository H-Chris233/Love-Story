<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { ApiError, api } from '@/services/api'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import { useSessionStore } from '@/stores/session'
import { useNotificationStore } from '@/stores/notification'
import { isoToShanghaiLocal, shanghaiLocalToIso } from '@/utils/date'

const session = useSessionStore()
const form = reactive({ title: '', intro: '', relationshipStartedAt: '' })
const partnerEmail = ref('')
const notification = useNotificationStore()
const busy = ref(false)
const username = ref(session.current?.user.username ?? '')
async function saveUsername() {
  busy.value = true
  try {
    session.current = await api.updateUsername(username.value)
    username.value = session.current.user.username ?? ''
    notification.show('用户名已保存。')
  } catch (reason) {
    notification.show(reason instanceof ApiError ? reason.message : '暂时无法保存用户名', 'error')
  } finally {
    busy.value = false
  }
}

const { load, loading, loadError } = useLoad(async () => {
  const story = await api.story()
  form.title = story.space.title
  form.intro = story.space.intro
  form.relationshipStartedAt = isoToShanghaiLocal(story.space.relationshipStartedAt)
})
onMounted(load)
async function save() {
  busy.value = true
  try {
    const space = await api.updateSettings({
      title: form.title,
      intro: form.intro,
      relationshipStartedAt: shanghaiLocalToIso(form.relationshipStartedAt)
    })
    if (session.current) session.current.space = space
    notification.show('空间资料已保存。')
  } catch (reason) {
    notification.show(reason instanceof ApiError ? reason.message : '暂时无法保存设置', 'error')
  } finally {
    busy.value = false
  }
}
async function invite() {
  busy.value = true
  try {
    const result = await api.invitePartner(partnerEmail.value)
    notification.show(
      result.invitationDelivery === 'sent'
        ? '邀请邮件已发送。'
        : '邀请已生成，但邮件发送失败，请稍后重试。',
      result.invitationDelivery === 'sent' ? 'success' : 'warning'
    )
  } catch (reason) {
    notification.show(reason instanceof ApiError ? reason.message : '暂时无法发送邀请', 'error')
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
    <form class="card card-pad stack" @submit.prevent="saveUsername">
      <h2>我的账号</h2>
      <p>邮箱：{{ session.current?.user.email }}</p>
      <label class="field"
        >用户名<input
          v-model="username"
          autocomplete="username"
          autocapitalize="none"
          pattern="[A-Za-z0-9_]{3,32}"
          minlength="3"
          maxlength="32"
          required
      /></label>
      <p class="muted">3–32 位字母、数字或下划线。公开昵称不会改变。</p>
      <div><button class="button" type="submit" :disabled="busy">保存用户名</button></div>
    </form>
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
