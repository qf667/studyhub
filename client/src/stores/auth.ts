import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

interface User {
  id: number
  username: string
  real_name: string
  role: string
  email?: string
  avatar_url?: string
  class_name?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref(localStorage.getItem('access_token') || '')
  const refreshToken = ref(localStorage.getItem('refresh_token') || '')

  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || '')

  function setUser(u: User) {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  function setTokens(access: string, refresh: string) {
    token.value = access
    refreshToken.value = refresh
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  }

  function clearAuth() {
    user.value = null
    token.value = ''
    refreshToken.value = ''
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }

  async function login(username: string, password: string) {
    const res: any = await api.post('/auth/login', { username, password })
    if (res.code === 200) {
      setTokens(res.data.accessToken, res.data.refreshToken)
      setUser(res.data.user)
      return true
    }
    throw new Error(res.message)
  }

  function logout() {
    clearAuth()
  }

  async function initFromStorage() {
    const saved = localStorage.getItem('user')
    const savedToken = localStorage.getItem('access_token')
    if (saved && savedToken) {
      try {
        user.value = JSON.parse(saved)
        token.value = savedToken
        // Validate token is still valid
        const res: any = await api.get('/auth/me')
        if (res.code !== 200) {
          clearAuth()
        }
      } catch (e) {
        clearAuth()
      }
    }
  }

  initFromStorage()

  return { user, token, refreshToken, isLoggedIn, userRole, login, logout, setUser, setTokens, clearAuth }
})
