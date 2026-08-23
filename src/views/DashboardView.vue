<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import LoveTimer from '@/components/LoveTimer.vue'
import { api } from '@/services/api'
import type { StoryView } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const story = ref<StoryView | null>(null)
const invitation = new URLSearchParams(window.location.search).get('invitation')
const latest = computed(() => story.value?.memories.slice(0, 3) ?? [])

onMounted(async () => (story.value = await api.story()))
</script>

<template>
  <div v-if="story" class="page">
    <p v-if="invitation === 'failed'" class="notice" role="status">
      空间已成功创建，但邀请邮件发送失败。可以在设置里重新发送。
    </p>
    <header class="page-heading">
      <div>
        <p class="eyebrow">Our little archive</p>
        <h1>{{ story.space.title }}</h1>
        <p class="lede">{{ story.space.intro }}</p>
      </div>
      <RouterLink class="button" to="/app/memories">写一条回忆</RouterLink>
    </header>
    <section class="card card-pad" style="text-align: center">
      <p class="muted">从 {{ formatShanghaiDate(story.space.relationshipStartedAt) }} 开始</p>
      <LoveTimer :started-at="story.space.relationshipStartedAt" />
      <p>{{ story.members.map((member) => member.displayName).join(' 与 ') }}</p>
    </section>
    <section class="page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Latest</p>
          <h2>最近的回忆</h2>
        </div>
        <RouterLink to="/app/memories">查看全部</RouterLink>
      </div>
      <div v-if="latest.length" class="grid grid--3">
        <article v-for="memory in latest" :key="memory.id" class="card memory-card">
          <img
            v-if="memory.assets[0]"
            class="memory-card__photo"
            :src="memory.assets[0].url"
            :alt="memory.title"
          />
          <div class="memory-card__body">
            <p class="eyebrow">{{ formatShanghaiDate(memory.occurredOn) }}</p>
            <h3>{{ memory.title }}</h3>
            <p>{{ memory.body }}</p>
          </div>
        </article>
      </div>
      <div v-else class="card empty">
        <h3>第一页还是空白</h3>
        <p>写下此刻最想留住的事情吧。</p>
      </div>
    </section>
  </div>
  <p v-else class="muted">正在整理纪念簿…</p>
</template>
