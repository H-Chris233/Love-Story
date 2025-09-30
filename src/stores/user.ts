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
        
        // 检查响应格式是哪种架构的格式
        // 传统服务器架构：直接返回用户对象
        // Serverless架构：返回 { success: true, user: {...} }
        if (response.data && (response.data as any).user) {
          // Serverless架构 - 从user属性中获取用户数据
          user.value = (response.data as any).user
        } else {
          // 传统架构 - 直接使用响应数据
          user.value = response.data
        }
        
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