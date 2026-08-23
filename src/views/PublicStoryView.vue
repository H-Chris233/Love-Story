<script setup lang="ts">
import { onMounted, ref } from 'vue'

import LoveTimer from '@/components/LoveTimer.vue'
import { ApiError, api } from '@/services/api'
import type { StoryView } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const story = ref<StoryView | null>(null)
const loading = ref(true)
const initialized = ref(true)

onMounted(async () => {
  try {
    story.value = await api.publicStory()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      initialized.value = (await api.status()).initialized
    } else {
      throw error
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="public-hero"><p class="muted">正在翻开纪念簿…</p></div>
  <div v-else-if="!story" class="public-hero">
    <div class="public-hero__inner stack">
      <p class="eyebrow">Love Story</p>
      <h1>{{ initialized ? '故事正在安静地生长' : '从今天开始记录' }}</h1>
      <p class="lede">
        {{
          initialized
            ? '主人还没有发布公开回忆。'
            : '这个空间尚未初始化，第一位成员可以创建双人纪念簿。'
        }}
      </p>
      <div class="cluster" style="justify-content: center">
        <RouterLink class="button" :to="initialized ? '/login' : '/setup'">
          {{ initialized ? '成员登录' : '创建纪念簿' }}
        </RouterLink>
      </div>
    </div>
  </div>
  <template v-else>
    <section class="public-hero">
      <div class="public-hero__inner">
        <p class="eyebrow">{{ story.members.map((member) => member.displayName).join(' × ') }}</p>
        <h1>{{ story.space.title }}</h1>
        <p class="lede">{{ story.space.intro }}</p>
        <LoveTimer :started-at="story.space.relationshipStartedAt" />
        <RouterLink class="button button--secondary" to="/login">成员登录</RouterLink>
      </div>
    </section>

    <div class="public-content page">
      <section class="page">
        <div class="page-heading">
          <div>
            <p class="eyebrow">Published memories</p>
            <h2>公开回忆</h2>
          </div>
        </div>
        <div v-if="story.memories.length" class="grid grid--2">
          <article v-for="memory in story.memories" :key="memory.id" class="card memory-card">
            <img
              v-if="memory.assets[0]"
              class="memory-card__photo"
              :src="memory.assets[0].url"
              :alt="memory.title"
            />
            <div class="memory-card__body">
              <div class="memory-card__meta">
                <span>{{ formatShanghaiDate(memory.occurredOn) }}</span
                ><span>{{ memory.authorName }}</span>
              </div>
              <h3>
                <RouterLink :to="`/story/${memory.slug}`">{{ memory.title }}</RouterLink>
              </h3>
              <p>{{ memory.body }}</p>
            </div>
          </article>
        </div>
        <div v-else class="card empty"><p>还没有公开的回忆。</p></div>
      </section>

      <section v-if="story.anniversaries.length" class="page">
        <div>
          <p class="eyebrow">Anniversaries</p>
          <h2>值得记住的日子</h2>
        </div>
        <div class="stack">
          <article v-for="item in story.anniversaries" :key="item.id" class="card anniversary-row">
            <div class="anniversary-row__date">
              {{ item.originalDate.slice(5).replace('-', '.') }}
            </div>
            <div>
              <h3>
                <RouterLink :to="`/anniversary/${item.slug}`">{{ item.title }}</RouterLink>
              </h3>
              <p class="muted">始于 {{ formatShanghaiDate(item.originalDate) }}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </template>
</template>
