import { ref } from 'vue'
import { defineStore } from 'pinia'
import { authAPI } from '../services/api'
import type { User } from '../types/api'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const isLoggedIn = ref<boolean>(!!token.value)

  // Fetch user profile
  const fetchUserProfile = async (): Promise<void> => {
    try {
      if (token.value) {
        const response = await authAPI.getProfile()
        user.value = response.data
        isLoggedIn.value = true
      }
    } catch (error) {
      // If token is invalid, clear it
      logout()
      console.error('获取用户信息失败:', error)
    }
  }

  // Login
  const login = (newToken: string): void => {
    token.value = newToken
    localStorage.setItem('token', newToken)
    isLoggedIn.value = true
  }

  // Logout
  const logout = (): void => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    isLoggedIn.value = false
  }

  return { user, token, isLoggedIn, fetchUserProfile, login, logout }
})