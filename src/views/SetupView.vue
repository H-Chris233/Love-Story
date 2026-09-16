<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthShell from '@/components/AuthShell.vue'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import { ApiError, api } from '@/services/api'
import { useSessionStore } from '@/stores/session'
import { useNotificationStore } from '@/stores/notification'
import { isoToShanghaiLocal, shanghaiLocalToIso } from '@/utils/date'

const router = useRouter()
const session = useSessionStore()
const notification = useNotificationStore()
const busy = ref(false)
const error = ref('')
const fields = ref<Record<string, string>>({})
const form = reactive({
  username: '',
  storyTitle: '',
  displayName: '',
  email: '',
  password: '',
  partnerEmail: '',
  relationshipStartedAt: isoToShanghaiLocal(new Date().toISOString())
})

const { load, loading, loadError } = useLoad(async () => {
  if ((await api.status()).initialized) await router.replace('/login')
})
onMounted(load)

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  fields.value = {}
  try {
    const result = await api.bootstrap({
      ...form,
      relationshipStartedAt: shanghaiLocalToIso(form.relationshipStartedAt)
    })
    session.current = { space: result.space, user: result.user }
    session.loaded = true
    notification.show(
      result.invitationDelivery === 'sent'
        ? '纪念簿已创建，邀请邮件已发送。'
        : '空间已成功创建，但邀请邮件发送失败。可以在设置里重新发送。',
      result.invitationDelivery === 'sent' ? 'success' : 'warning'
    )
    await router.push({ name: 'dashboard' })
  } catch (reason) {
    if (reason instanceof ApiError) {
      error.value = reason.message
      fields.value = reason.fields ?? {}
    } else error.value = '暂时无法创建纪念簿'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell>
    <LoadState :loading="loading" :error="loadError" @retry="load" />
    <form v-if="!loading && !loadError" class="auth-form stack" @submit.prevent="submit">
      <div>
        <h2>创建双人纪念簿</h2>
      </div>
      <p class="muted">首位成员完成初始化后，我们会向伴侣发送一封 7 天有效的邀请。</p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="field">
        <label for="username">用户名</label
        ><input
          id="username"
          v-model="form.username"
          autocomplete="username"
          autocapitalize="none"
          pattern="[A-Za-z0-9_]{3,32}"
          minlength="3"
          maxlength="32"
          required
        />
        <p class="muted">3–32 位字母、数字或下划线，用于登录，不作为公开昵称。</p>
      </div>
      <div class="field">
        <label for="title">故事标题</label><input id="title" v-model="form.storyTitle" required />
        <p v-if="fields.storyTitle" class="field-error">{{ fields.storyTitle }}</p>
      </div>
      <div class="field">
        <label for="name">你的公开昵称</label
        ><input id="name" v-model="form.displayName" autocomplete="name" required />
      </div>
      <div class="field">
        <label for="started">恋爱开始时间（北京时间）</label
        ><input id="started" v-model="form.relationshipStartedAt" type="datetime-local" required />
      </div>
      <div class="field">
        <label for="owner-email">你的邮箱</label
        ><input id="owner-email" v-model="form.email" type="email" autocomplete="email" required />
      </div>
      <div class="field">
        <label for="owner-password">密码</label
        ><input
          id="owner-password"
          v-model="form.password"
          type="password"
          minlength="10"
          autocomplete="new-password"
          required
        />
        <p class="muted">至少 10 位</p>
      </div>
      <div class="field">
        <label for="partner-email">伴侣邮箱</label
        ><input id="partner-email" v-model="form.partnerEmail" type="email" required />
      </div>
      <button class="button" :disabled="busy" type="submit">
        {{ busy ? '创建中…' : '创建纪念簿' }}
      </button>
    </form>
  </AuthShell>
</template>
