<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import LoveTimer from '@/components/LoveTimer.vue'
import LoadState from '@/components/LoadState.vue'
import { useLoad } from '@/utils/load'
import { api } from '@/services/api'
import type { StorySummary } from '@/types/domain'
import { formatShanghaiDate } from '@/utils/date'

const story = ref<StorySummary | null>(null)
const latest = computed(() => story.value?.memories ?? [])

const { load, loading, loadError } = useLoad(async () => (story.value = await api.story()))
onMounted(load)
</script>

<template>
  <LoadState :loading="loading" :error="loadError" @retry="load" />
  <div v-if="story" class="page dashboard">
    <header class="page-heading">
      <div>
        <h1>{{ story.space.title }}</h1>
      </div>
      <RouterLink class="button" to="/app/memories"
        ><span aria-hidden="true">＋</span> 写一条回忆</RouterLink
      >
    </header>
    <section class="together-card" aria-label="我们的恋爱时光">
      <div class="together-card__content">
        <div class="couple-names">
          <template v-for="(member, index) in story.members" :key="member.id">
            <span v-if="index" class="couple-names__heart" aria-hidden="true">♥</span>
            <span class="couple-names__member">{{ member.displayName }}</span>
          </template>
        </div>
        <h2 class="together-card__label">我们在一起</h2>
        <LoveTimer :started-at="story.space.relationshipStartedAt" />
        <p class="together-card__date">
          {{ formatShanghaiDate(story.space.relationshipStartedAt) }} 起
        </p>
      </div>
      <img class="together-card__art" src="/together-rabbits.png" alt="" width="320" height="320" />
    </section>
    <section class="page">
      <div class="page-heading">
        <h2>最近的回忆</h2>
        <RouterLink class="section-link" to="/app/memories"
          >查看全部 <span aria-hidden="true">→</span></RouterLink
        >
      </div>
      <div v-if="latest.length" class="grid grid--3">
        <article v-for="memory in latest" :key="memory.id" class="card memory-card">
          <img
            v-if="memory.cover"
            class="memory-card__photo"
            :src="memory.cover.url"
            :alt="memory.title"
            loading="lazy"
            decoding="async"
          />
          <div class="memory-card__body">
            <p class="memory-card__meta">{{ formatShanghaiDate(memory.occurredOn) }}</p>
            <h3>{{ memory.title }}</h3>
            <p>{{ memory.body }}</p>
          </div>
        </article>
      </div>
      <div v-else class="card empty dashboard-empty">
        <span class="empty__mark" aria-hidden="true">♡</span>
        <h3>还没有回忆</h3>
        <RouterLink class="section-link" to="/app/memories">记下我们的第一件小事 →</RouterLink>
      </div>
    </section>
  </div>
</template>
