import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function clearAuth() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

api.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code === 401) {
      clearAuth()
      window.location.href = '/login'
      return Promise.reject(new Error('未登录或Token已过期'))
    }
    return data
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(new Error('未登录或Token已过期'))
      }
      if (status === 403) {
        ElMessage.error('权限不足')
        return Promise.reject(error)
      }
      if (status === 429) {
        ElMessage.error('请求过于频繁，请稍后再试')
        return Promise.reject(error)
      }
      const msg = error.response.data?.message || `请求失败(${status})`
      ElMessage.error(msg)
    } else {
      ElMessage.error('网络连接失败，请检查网络')
    }
    return Promise.reject(error)
  }
)

export default api
