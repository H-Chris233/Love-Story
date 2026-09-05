<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthShell from '@/components/AuthShell.vue'
import { ApiError, api } from '@/services/api'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const form = reactive({ displayName: '', password: '', username: '', email: '' })
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    const result = await api.acceptInvitation({ token: String(route.params.token), ...form })
    session.current = result
    session.loaded = true
    await router.push('/app')
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '暂时无法接受邀请'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell>
    <form class="auth-form stack" @submit.prevent="submit">
      <div>
        <p class="eyebrow">Together</p>
        <h2>加入你们的纪念簿</h2>
      </div>
      <p class="muted">邀请只能使用一次，有效期为 7 天。</p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="field">
        <label for="invite-username">用户名</label
        ><input
          id="invite-username"
          v-model="form.username"
          autocomplete="username"
          autocapitalize="none"
          pattern="[A-Za-z0-9_]{3,32}"
          minlength="3"
          maxlength="32"
          required
        />
      </div>
      <div class="field">
        <label for="invite-email">受邀邮箱</label
        ><input id="invite-email" v-model="form.email" type="email" autocomplete="email" required />
        <p class="muted">请填写收到邀请的邮箱。</p>
      </div>
      <div class="field">
        <label for="invite-name">你的公开昵称</label
        ><input id="invite-name" v-model="form.displayName" autocomplete="name" required />
      </div>
      <div class="field">
        <label for="invite-password">设置密码</label
        ><input
          id="invite-password"
          v-model="form.password"
          type="password"
          minlength="10"
          autocomplete="new-password"
          required
        />
      </div>
      <button class="button" :disabled="busy" type="submit">
        {{ busy ? '加入中…' : '接受邀请' }}
      </button>
    </form>
  </AuthShell>
</template>
