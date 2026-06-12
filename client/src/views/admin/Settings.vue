<template>
  <div>
    <el-card>
      <template #header><span>系统配置</span></template>
      <el-form :model="settings" label-width="150px" style="max-width: 600px">
        <el-form-item label="系统名称">
          <el-input v-model="settings.siteName" />
        </el-form-item>
        <el-form-item label="允许注册">
          <el-switch v-model="settings.allowRegister" />
        </el-form-item>
        <el-form-item label="默认学生密码">
          <el-input v-model="settings.defaultPassword" />
        </el-form-item>
        <el-form-item label="AI出题功能">
          <el-switch v-model="settings.aiEnabled" />
        </el-form-item>
        <el-form-item label="最大上传文件大小(MB)">
          <el-input-number v-model="settings.maxFileSize" :min="1" :max="100" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="save">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

const settings = reactive({
  siteName: 'StudyHub 学生管理系统',
  allowRegister: true,
  defaultPassword: '123456',
  aiEnabled: true,
  maxFileSize: 50
})

function save() {
  localStorage.setItem('studyhub_settings', JSON.stringify(settings))
  ElMessage.success('保存成功')
}

// Load from storage
const saved = localStorage.getItem('studyhub_settings')
if (saved) {
  try { Object.assign(settings, JSON.parse(saved)) } catch (e) {}
}
</script>
