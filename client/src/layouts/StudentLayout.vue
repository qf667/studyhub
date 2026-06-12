<template>
  <el-container style="height: 100vh">
    <div v-if="theme.isMobile && !theme.sidebarCollapsed" class="sidebar-overlay" @click="theme.toggleSidebar"></div>

    <el-aside :width="sidebarWidth" class="app-sidebar" :class="{ collapsed: theme.sidebarCollapsed, mobile: theme.isMobile }">
      <div class="sidebar-header">
        <span v-if="!theme.sidebarCollapsed">StudyHub 学生端</span>
        <span v-else>SH</span>
      </div>
      <el-menu :default-active="route.path" router :collapse="theme.sidebarCollapsed" background-color="transparent" text-color="var(--sidebar-text)" active-text-color="var(--sidebar-active)">
        <el-menu-item index="/student">
          <el-icon><HomeFilled /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        <el-menu-item index="/student/courses">
          <el-icon><Reading /></el-icon>
          <template #title>我的课程</template>
        </el-menu-item>
        <el-menu-item index="/student/wrong-questions">
          <el-icon><Notebook /></el-icon>
          <template #title>错题本</template>
        </el-menu-item>
        <el-menu-item index="/student/report">
          <el-icon><TrendCharts /></el-icon>
          <template #title>学习报告</template>
        </el-menu-item>
        <el-menu-item index="/student/chat">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>AI问答</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- Mobile bottom tab bar -->
    <div v-if="theme.isMobile" class="mobile-tabbar">
      <div class="tab-item" :class="{ active: route.path === '/student' }" @click="$router.push('/student')">
        <el-icon><HomeFilled /></el-icon>
        <span>首页</span>
      </div>
      <div class="tab-item" :class="{ active: route.path.includes('/courses') }" @click="$router.push('/student/courses')">
        <el-icon><Reading /></el-icon>
        <span>课程</span>
      </div>
      <div class="tab-item" :class="{ active: route.path.includes('/wrong') }" @click="$router.push('/student/wrong-questions')">
        <el-icon><Notebook /></el-icon>
        <span>错题</span>
      </div>
      <div class="tab-item" :class="{ active: route.path.includes('/report') }" @click="$router.push('/student/report')">
        <el-icon><TrendCharts /></el-icon>
        <span>报告</span>
      </div>
      <div class="tab-item" :class="{ active: route.path.includes('/chat') }" @click="$router.push('/student/chat')">
        <el-icon><ChatDotRound /></el-icon>
        <span>AI</span>
      </div>
    </div>

    <el-container>
      <el-header class="app-header">
        <div style="display: flex; align-items: center; gap: 12px">
          <el-icon :size="20" style="cursor: pointer" @click="theme.toggleSidebar" class="show-on-mobile">
            <Fold v-if="!theme.sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
          <span class="header-title">{{ currentTitle }}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px">
          <el-icon :size="18" style="cursor: pointer" @click="theme.toggleTheme">
            <Moon v-if="!theme.isDark" />
            <Sunny v-else />
          </el-icon>
          <el-dropdown @command="handleCommand">
            <span style="cursor: pointer; display: flex; align-items: center; gap: 8px">
              <el-avatar :size="32">{{ auth.user?.real_name?.charAt(0) || 'S' }}</el-avatar>
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
      <el-main class="app-main" :style="{ paddingBottom: theme.isMobile ? '60px' : '20px' }">
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

const currentTitle = computed(() => {
  if (route.path === '/student') return '首页'
  if (route.path === '/student/courses') return '我的课程'
  if (route.path.includes('/student/course/')) return '课程学习'
  if (route.path.includes('/student/homework/')) return '在线答题'
  if (route.path === '/student/wrong-questions') return '错题本'
  if (route.path === '/student/report') return '学习报告'
  if (route.path === '/student/chat') return 'AI智能问答'
  return '学生中心'
})

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
  left: 0; top: 0; bottom: 0;
  z-index: 1000;
}
.app-sidebar.collapsed.mobile { width: 0 !important; }
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
.header-title { font-size: 16px; font-weight: 500; }
.app-main { background: var(--bg-secondary); padding: 20px; overflow-y: auto; }

/* Mobile bottom tab bar */
.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--sidebar-bg);
  display: flex;
  z-index: 1001;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--sidebar-text);
  font-size: 11px;
  cursor: pointer;
  gap: 2px;
  transition: color 0.2s;
}
.tab-item.active {
  color: var(--sidebar-active);
}
.tab-item .el-icon {
  font-size: 20px;
}
</style>
