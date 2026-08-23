<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import AuthShell from '@/components/AuthShell.vue'
import { ApiError, api } from '@/services/api'

const route = useRoute()
const password = ref('')
const completed = ref(false)
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await api.resetPassword(String(route.params.token), password.value)
    completed.value = true
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '暂时无法重置密码'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell>
    <div v-if="completed" class="auth-form stack">
      <p class="eyebrow">Updated</p>
      <h2>密码已经更新</h2>
      <p class="muted">所有旧会话均已撤销，请重新登录。</p>
      <RouterLink class="button" to="/login">去登录</RouterLink>
    </div>
    <form v-else class="auth-form stack" @submit.prevent="submit">
      <div>
        <p class="eyebrow">New password</p>
        <h2>设置新密码</h2>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="field">
        <label for="new-password">新密码</label
        ><input
          id="new-password"
          v-model="password"
          type="password"
          minlength="10"
          autocomplete="new-password"
          required
        />
      </div>
      <button class="button" :disabled="busy" type="submit">保存新密码</button>
    </form>
  </AuthShell>
</template>
