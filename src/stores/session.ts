import { defineStore } from 'pinia'

import { ApiError, api } from '@/services/api'
import type { SessionView } from '@/types/domain'

export const useSessionStore = defineStore('session', {
  state: () => ({
    current: null as SessionView | null,
    loaded: false,
    error: ''
  }),
  getters: {
    isAuthenticated: (state) => state.current !== null
  },
  actions: {
    clear() {
      this.current = null
      this.loaded = true
      this.error = ''
    },
    async ensureLoaded() {
      if (this.loaded) return
      this.error = ''
      try {
        this.current = await api.session()
        this.loaded = true
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          this.error = '暂时无法连接服务，请重试'
          return
        }
        this.current = null
        this.loaded = true
      }
    },
    async login(email: string, password: string) {
      this.current = await api.login({ email, password })
      this.loaded = true
      this.error = ''
    },
    async logout() {
      await api.logout()
      this.clear()
    }
  }
})
