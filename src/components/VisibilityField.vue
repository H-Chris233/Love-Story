<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="stack">
    <label class="cluster">
      <input v-model="model" type="checkbox" />
      <span>发布到访客故事页</span>
    </label>
    <p v-if="model" class="notice" role="status">
      公开后，任何拿到网站地址的人都能看到这条内容及其中的照片。
    </p>
  </div>
</template>
