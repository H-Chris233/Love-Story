import { defineStore } from 'pinia'

type Tone = 'success' | 'warning' | 'error'
export const useNotificationStore = defineStore('notification', {
  state: () => ({ current: null as { message: string; tone: Tone } | null }),
  actions: {
    show(message: string, tone: Tone = 'success') {
      this.current = { message, tone }
    },
    dismiss() {
      this.current = null
    }
  }
})
