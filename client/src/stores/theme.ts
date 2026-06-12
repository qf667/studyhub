import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('theme') === 'dark')
  const sidebarCollapsed = ref(false)
  const isMobile = ref(window.innerWidth < 768)

  function toggleTheme() {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function checkMobile() {
    isMobile.value = window.innerWidth < 768
    if (isMobile.value) {
      sidebarCollapsed.value = true
    }
  }

  // Initialize
  applyTheme()
  window.addEventListener('resize', checkMobile)
  checkMobile()

  return { isDark, sidebarCollapsed, isMobile, toggleTheme, toggleSidebar }
})
