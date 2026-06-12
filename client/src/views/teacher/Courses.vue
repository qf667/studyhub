<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>我的课程</span>
          <el-button type="primary" @click="showCreateDialog = true">创建课程</el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" v-for="course in courses" :key="course.id" style="margin-bottom: 20px">
          <el-card shadow="hover" style="cursor: pointer" @click="$router.push(`/teacher/course/${course.id}`)">
            <div style="height: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; font-weight: bold; margin-bottom: 12px">
              {{ course.name?.charAt(0) }}
            </div>
            <h3 style="margin: 0 0 8px; font-size: 16px">{{ course.name }}</h3>
            <p style="color: #999; font-size: 13px; margin: 0 0 8px">{{ course.description?.substring(0, 50) || '暂无描述' }}</p>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <el-tag :type="{ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger' }[course.status as string]" size="small">
                {{ { draft: '草稿', pending: '待审核', approved: '已通过', rejected: '已拒绝' }[course.status as string] }}
              </el-tag>
              <span style="color: #999; font-size: 12px">{{ course.subject }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="courses.length === 0" description="暂无课程，点击上方按钮创建" />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="创建课程" width="600">
      <el-form :model="courseForm" label-width="80px">
        <el-form-item label="课程名称"><el-input v-model="courseForm.name" /></el-form-item>
        <el-form-item label="学科分类"><el-input v-model="courseForm.subject" placeholder="如：计算机科学、数学" /></el-form-item>
        <el-form-item label="课程描述"><el-input v-model="courseForm.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="开始日期"><el-date-picker v-model="courseForm.start_date" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="结束日期"><el-date-picker v-model="courseForm.end_date" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createCourse">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import { ElMessage } from 'element-plus'

const courses = ref<any[]>([])
const showCreateDialog = ref(false)
const courseForm = reactive({ name: '', subject: '', description: '', start_date: '', end_date: '' })

async function loadCourses() {
  const res: any = await api.get('/courses')
  if (res.code === 200) courses.value = res.data.list
}

async function createCourse() {
  if (!courseForm.name) { ElMessage.warning('请输入课程名称'); return }
  const res: any = await api.post('/courses', courseForm)
  if (res.code === 200) {
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    loadCourses()
  }
}

onMounted(loadCourses)
</script>
