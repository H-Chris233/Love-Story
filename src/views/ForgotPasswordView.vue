<script setup lang="ts">
import { ref } from 'vue'

import AuthShell from '@/components/AuthShell.vue'
import { api } from '@/services/api'

const email = ref('')
const sent = ref(false)
const busy = ref(false)

async function submit() {
  busy.value = true
  try {
    await api.forgotPassword(email.value)
    sent.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell>
    <div v-if="sent" class="auth-form stack">
      <p class="eyebrow">Check your inbox</p>
      <h2>请检查邮箱</h2>
      <p class="muted">如果该邮箱属于空间成员，你会收到一封 1 小时有效的重置邮件。</p>
      <RouterLink class="button button--secondary" to="/login">返回登录</RouterLink>
    </div>
    <form v-else class="auth-form stack" @submit.prevent="submit">
      <div>
        <p class="eyebrow">Password</p>
        <h2>找回密码</h2>
      </div>
      <p class="muted">无论邮箱是否存在，接口都会返回相同结果。</p>
      <div class="field">
        <label for="forgot-email">邮箱</label
        ><input id="forgot-email" v-model="email" type="email" autocomplete="email" required />
      </div>
      <button class="button" :disabled="busy" type="submit">发送重置邮件</button>
    </form>
  </AuthShell>
</template>
