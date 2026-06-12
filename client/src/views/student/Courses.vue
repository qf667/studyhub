<template>
  <div>
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="8" v-for="course in courses" :key="course.id" style="margin-bottom: 20px">
        <el-card shadow="hover" style="cursor: pointer" @click="$router.push(`/student/course/${course.id}`)">
          <div style="height: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; font-weight: bold; margin-bottom: 12px">
            {{ course.name?.charAt(0) }}
          </div>
          <h3 style="margin: 0 0 8px; font-size: 16px">{{ course.name }}</h3>
          <p style="color: #999; font-size: 13px; margin: 0 0 8px">{{ course.description?.substring(0, 50) || '暂无描述' }}</p>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span style="color: #666; font-size: 13px">{{ course.teacher_name }}</span>
            <span style="color: #999; font-size: 12px">{{ course.subject }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-if="courses.length === 0" description="暂未分配课程" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../api'

const courses = ref<any[]>([])

async function loadCourses() {
  const res: any = await api.get('/courses')
  if (res.code === 200) courses.value = res.data.list
}

onMounted(loadCourses)
</script>
