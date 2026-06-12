<template>
  <el-container style="height: 100vh">
    <!-- Mobile overlay -->
    <div v-if="theme.isMobile && !theme.sidebarCollapsed" class="sidebar-overlay" @click="theme.toggleSidebar"></div>

    <el-aside :width="sidebarWidth" class="app-sidebar" :class="{ collapsed: theme.sidebarCollapsed, mobile: theme.isMobile }">
      <div class="sidebar-header">
        <span v-if="!theme.sidebarCollapsed" class="logo-text">StudyHub</span>
        <span v-else class="logo-text">SH</span>
      </div>
      <el-menu :default-active="route.path" router :collapse="theme.sidebarCollapsed" background-color="transparent" text-color="var(--sidebar-text)" active-text-color="var(--sidebar-active)">
        <el-menu-item index="/admin">
          <el-icon><DataBoard /></el-icon>
          <template #title>数据看板</template>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/courses">
          <el-icon><Reading /></el-icon>
          <template #title>课程管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/settings">
          <el-icon><Setting /></el-icon>
          <template #title>系统配置</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div style="display: flex; align-items: center; gap: 12px">
          <el-icon :size="20" style="cursor: pointer" @click="theme.toggleSidebar">
            <Fold v-if="!theme.sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
          <span class="header-title hide-on-mobile">{{ currentTitle }}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px">
          <el-icon :size="18" style="cursor: pointer" @click="theme.toggleTheme">
            <Moon v-if="!theme.isDark" />
            <Sunny v-else />
          </el-icon>
          <el-dropdown @command="handleCommand">
            <span style="cursor: pointer; display: flex; align-items: center; gap: 8px">
              <el-avatar :size="32">{{ auth.user?.real_name?.charAt(0) || 'A' }}</el-avatar>
              <span class="hide-on-mobile">{{ auth.user?.real_name || auth.user?.username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

const sidebarWidth = computed(() => {
  if (theme.isMobile) return theme.sidebarCollapsed ? '0px' : '220px'
  return theme.sidebarCollapsed ? '64px' : '220px'
})

const titleMap: Record<string, string> = {
  '/admin': '数据看板', '/admin/users': '用户管理', '/admin/courses': '课程管理', '/admin/settings': '系统配置'
}
const currentTitle = computed(() => titleMap[route.path] || '管理后台')

function handleCommand(cmd: string) {
  if (cmd === 'logout') { auth.logout(); router.push('/login') }
}
</script>

<style scoped>
.app-sidebar {
  background: var(--sidebar-bg);
  transition: width 0.3s;
  overflow: hidden;
  border-right: 1px solid var(--border-color);
}
.app-sidebar.mobile {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 1000;
}
.app-sidebar.collapsed.mobile {
  width: 0 !important;
}
.sidebar-header {
  padding: 16px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  white-space: nowrap;
}
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background: var(--header-bg);
  color: var(--text-primary);
}
.header-title {
  font-size: 16px;
  font-weight: 500;
}
.app-main {
  background: var(--bg-secondary);
  padding: 20px;
  overflow-y: auto;
}
</style>
