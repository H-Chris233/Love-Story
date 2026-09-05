<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthShell from '@/components/AuthShell.vue'
import { ApiError } from '@/services/api'
import { useSessionStore } from '@/stores/session'

const identifier = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
const session = useSessionStore()
const route = useRoute()
const router = useRouter()

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await session.login(identifier.value, password.value)
    await router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/app')
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '暂时无法登录'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell>
    <form class="auth-form stack" @submit.prevent="submit">
      <div>
        <p class="eyebrow">Welcome back</p>
        <h2>回到我们的故事</h2>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="field">
        <label for="identifier">用户名或邮箱</label
        ><input
          id="identifier"
          v-model="identifier"
          autocomplete="username"
          autocapitalize="none"
          required
        />
      </div>
      <div class="field">
        <label for="password">密码</label
        ><input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <button class="button" :disabled="busy" type="submit">{{ busy ? '登录中…' : '登录' }}</button>
      <div class="cluster">
        <RouterLink to="/forgot-password">忘记密码</RouterLink><span class="muted">·</span
        ><RouterLink to="/setup">首次初始化</RouterLink>
      </div>
    </form>
  </AuthShell>
</template>
