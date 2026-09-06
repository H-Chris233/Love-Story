<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useNotificationStore } from '@/stores/notification'

const notification = useNotificationStore()
const hovered = ref(false)
const focused = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
function stop() {
  clearTimeout(timer)
}
function schedule() {
  stop()
  if (notification.current && !hovered.value && !focused.value) {
    timer = setTimeout(
      () => notification.dismiss(),
      notification.current.tone === 'success' ? 5000 : 8000
    )
  }
}
function focusOut(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
    focused.value = false
}
watch([() => notification.current, hovered, focused], schedule, { immediate: true })
watch(
  () => notification.current,
  (current) => {
    if (!current) {
      hovered.value = false
      focused.value = false
    }
  }
)
onBeforeUnmount(stop)
</script>

<template>
  <Teleport to="body">
    <div class="notification-host" aria-live="polite" aria-atomic="true">
      <div
        v-if="notification.current"
        :class="['notification-toast', `notification-toast--${notification.current.tone}`]"
        role="status"
        @mouseenter="hovered = true"
        @mouseleave="hovered = false"
        @focusin="focused = true"
        @focusout="focusOut"
      >
        <p>{{ notification.current.message }}</p>
        <button
          type="button"
          class="notification-close"
          aria-label="关闭通知"
          @click="notification.dismiss()"
        >
          ×
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-host {
  position: fixed;
  top: calc(20px + env(safe-area-inset-top, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  z-index: 1000;
  width: min(400px, calc(100vw - 32px));
  pointer-events: none;
}
.notification-toast {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 16px 12px 16px 20px;
  border: 1px solid var(--line);
  border-left: 4px solid #52604e;
  border-radius: 12px;
  background: #fffdf8;
  color: var(--ink);
  box-shadow: var(--shadow);
  pointer-events: auto;
  overflow-wrap: anywhere;
}
.notification-toast--warning {
  border-left-color: #9a6429;
}
.notification-toast--error {
  border-left-color: #963f3f;
}
.notification-toast p {
  flex: 1;
  margin: 0;
}
.notification-close {
  flex: 0 0 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  font-size: 24px;
}
.notification-close:hover {
  background: var(--paper-deep);
}
</style>
