import { defineStore } from 'pinia'

import { ApiError, api } from '@/services/api'
import type { SessionView } from '@/types/domain'

export const useSessionStore = defineStore('session', {
  state: () => ({
    current: null as SessionView | null,
    loaded: false
  }),
  getters: {
    isAuthenticated: (state) => state.current !== null
  },
  actions: {
    clear() {
      this.current = null
      this.loaded = true
    },
    async ensureLoaded() {
      if (this.loaded) return
      try {
        this.current = await api.session()
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error
        this.current = null
      } finally {
        this.loaded = true
      }
    },
    async login(email: string, password: string) {
      this.current = await api.login({ email, password })
      this.loaded = true
    },
    async logout() {
      await api.logout()
      this.clear()
    }
  }
})
