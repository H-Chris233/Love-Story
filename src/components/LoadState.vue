<script setup lang="ts">
defineProps<{ loading: boolean; error: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <p v-if="loading" role="status" class="muted">正在加载…</p>
  <div v-else-if="error" class="form-error" role="alert">
    <p>{{ error }}</p>
    <button class="button button--secondary" type="button" @click="$emit('retry')">重试</button>
  </div>
</template>
