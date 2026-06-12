<template>
  <div class="login-container">
    <div class="login-card">
      <div style="text-align: center; margin-bottom: 24px">
        <el-icon :size="18" style="cursor: pointer; position: absolute; right: 20px; top: 20px" @click="theme.toggleTheme">
          <Moon v-if="!theme.isDark" />
          <Sunny v-else />
        </el-icon>
        <h1>StudyHub</h1>
        <p class="subtitle">学生管理系统</p>
      </div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" @submit.prevent="handleLogin" style="margin-top: 20px">
            <el-form-item>
              <el-input v-model="loginForm.username" placeholder="用户名" prefix-icon="User" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="loginForm.password" type="password" placeholder="密码" prefix-icon="Lock" size="large" show-password />
            </el-form-item>
            <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">登 录</el-button>
          </el-form>
          <div style="margin-top: 16px; text-align: center; color: var(--text-muted, #999); font-size: 13px">
            预置账号：admin / admin123（管理员）
          </div>
        </el-tab-pane>
        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" @submit.prevent="handleRegister" style="margin-top: 20px">
            <el-form-item>
              <el-input v-model="registerForm.username" placeholder="用户名（3-30个字符）" prefix-icon="User" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="registerForm.real_name" placeholder="真实姓名" prefix-icon="Postcard" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="registerForm.email" placeholder="邮箱（选填）" prefix-icon="Message" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="registerForm.password" type="password" placeholder="密码（至少6位）" prefix-icon="Lock" size="large" show-password />
            </el-form-item>
            <el-form-item>
              <el-input v-model="registerForm.class_name" placeholder="班级（如：计算机2班）" prefix-icon="OfficeBuilding" size="large" />
            </el-form-item>
            <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleRegister">注 册</el-button>
          </el-form>
          <div style="margin-top: 12px; text-align: center; color: var(--text-muted, #999); font-size: 12px">
            注册默认为学生账号，教师账号请联系管理员创建
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { ElMessage } from 'element-plus'
import api from '../api'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const activeTab = ref('login')
const loading = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', real_name: '', email: '', password: '', class_name: '' })

async function handleLogin() {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(loginForm.username, loginForm.password)
    ElMessage.success('登录成功')
    router.push(`/${auth.userRole}`)
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!registerForm.username || !registerForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  if (registerForm.username.length < 3) {
    ElMessage.warning('用户名至少3个字符')
    return
  }
  if (registerForm.password.length < 6) {
    ElMessage.warning('密码至少6个字符')
    return
  }
  loading.value = true
  try {
    const res: any = await api.post('/auth/register', registerForm)
    if (res.code === 200) {
      ElMessage.success('注册成功，请登录')
      activeTab.value = 'login'
      loginForm.username = registerForm.username
      loginForm.password = registerForm.password
    } else {
      ElMessage.error(res.message)
    }
  } catch (e: any) {
    ElMessage.error(e.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}
.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background: var(--bg-card, #fff);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  position: relative;
}
.login-card h1 {
  text-align: center;
  font-size: 32px;
  color: var(--text-primary, #333);
  margin-bottom: 4px;
}
.subtitle {
  text-align: center;
  color: var(--text-muted, #999);
  margin-bottom: 8px;
}

@media (max-width: 480px) {
  .login-card {
    padding: 24px;
  }
  .login-card h1 {
    font-size: 24px;
  }
}
</style>
