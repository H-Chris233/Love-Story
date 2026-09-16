<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { ApiError, api } from '@/services/api'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import { useSessionStore } from '@/stores/session'
import { useNotificationStore } from '@/stores/notification'
import { isoToShanghaiLocal, shanghaiLocalToIso } from '@/utils/date'
import type { ReminderIssue } from '@/types/domain'

const session = useSessionStore()
const form = reactive({ title: '', intro: '', relationshipStartedAt: '' })
const partnerEmail = ref('')
const notification = useNotificationStore()
const busy = ref(false)
const membersJoined = ref(0)
const reminderIssues = ref<ReminderIssue[]>([])
const username = ref(session.current?.user.username ?? '')
async function saveUsername() {
  if (busy.value) return
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
  const [story, issues] = await Promise.all([api.story(), api.reminderStatus()])
  form.title = story.space.title
  form.intro = story.space.intro
  form.relationshipStartedAt = isoToShanghaiLocal(story.space.relationshipStartedAt)
  membersJoined.value = story.members.length
  reminderIssues.value = issues
})
onMounted(load)
async function save() {
  if (busy.value) return
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
  if (busy.value) return
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
async function retryReminder(issue: ReminderIssue) {
  if (busy.value) return
  const confirmDuplicateRisk =
    issue.status === 'needsReview' &&
    window.confirm('这条提醒已超过安全重试窗口，重新发送可能造成重复邮件。仍要继续吗？')
  if (issue.status === 'needsReview' && !confirmDuplicateRisk) return
  busy.value = true
  try {
    await api.retryReminder(issue.id, confirmDuplicateRisk)
    reminderIssues.value = await api.reminderStatus()
    notification.show('提醒已重新发送。')
  } catch (reason) {
    notification.show(reason instanceof ApiError ? reason.message : '提醒重试失败', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <h1>空间设置</h1>
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
    <form
      v-if="!loading && !loadError && membersJoined < 2"
      class="card card-pad stack"
      @submit.prevent="invite"
    >
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
    <section v-else-if="!loading && !loadError" class="card card-pad stack">
      <h2>伴侣邀请</h2>
      <p>两位成员已加入</p>
    </section>
    <section v-if="!loading && !loadError" class="card card-pad stack">
      <h2>提醒投递状态</h2>
      <p v-if="!reminderIssues.length" class="muted">当前没有需要处理的提醒。</p>
      <article v-for="issue in reminderIssues" :key="issue.id" class="stack notice">
        <h3>{{ issue.title }}</h3>
        <p>
          接收成员：{{ issue.recipient }} · 日期：{{ issue.occurrenceDate }} ·
          {{ issue.kind === 'today' ? '当天提醒' : '提前提醒' }}
        </p>
        <p class="muted">
          首次尝试：{{
            issue.firstAttemptAt
              ? isoToShanghaiLocal(issue.firstAttemptAt).replace('T', ' ')
              : '尚未尝试'
          }}
        </p>
        <p v-if="issue.status === 'needsReview'" class="form-error">
          已超过安全重试窗口，重发可能产生重复邮件。
        </p>
        <div>
          <button
            class="button button--secondary"
            type="button"
            :disabled="busy"
            @click="retryReminder(issue)"
          >
            重试发送
          </button>
        </div>
      </article>
    </section>
  </div>
</template>
