<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ startedAt: string }>()
const now = ref(Date.now())
let timer: number | undefined

const elapsed = computed(() => Math.max(0, now.value - new Date(props.startedAt).getTime()))
const units = computed(() => {
  let seconds = Math.floor(elapsed.value / 1000)
  const days = Math.floor(seconds / 86400)
  seconds %= 86400
  const hours = Math.floor(seconds / 3600)
  seconds %= 3600
  const minutes = Math.floor(seconds / 60)
  return [
    { label: '天', value: days },
    { label: '小时', value: hours },
    { label: '分钟', value: minutes },
    { label: '秒', value: seconds % 60 }
  ]
})

onMounted(() => {
  timer = window.setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="timer" aria-label="恋爱计时" aria-live="off">
    <div v-for="unit in units" :key="unit.label" class="timer__unit">
      <span class="timer__value">{{ unit.value }}</span>
      <span class="timer__label">{{ unit.label }}</span>
    </div>
  </div>
</template>
