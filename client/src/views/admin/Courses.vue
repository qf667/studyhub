<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>课程管理</span>
          <el-radio-group v-model="filterStatus" @change="loadCourses">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="pending">待审核</el-radio-button>
            <el-radio-button label="approved">已通过</el-radio-button>
            <el-radio-button label="rejected">已拒绝</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="courses" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="课程名称" />
        <el-table-column prop="teacher_name" label="教师" width="100" />
        <el-table-column prop="subject" label="学科" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="{ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger' }[row.status as string]" size="small">
              {{ { draft: '草稿', pending: '待审核', approved: '已通过', rejected: '已拒绝' }[row.status as string] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="start_date" label="开始日期" width="110" />
        <el-table-column prop="end_date" label="结束日期" width="110" />
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="success" size="small" @click="review(row.id, 'approved')">通过</el-button>
              <el-button type="danger" size="small" @click="review(row.id, 'rejected')">拒绝</el-button>
            </template>
            <el-popconfirm title="确定删除？" @confirm="deleteCourse(row.id)">
              <template #reference><el-button size="small" type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../api'
import { ElMessage } from 'element-plus'

const courses = ref<any[]>([])
const loading = ref(false)
const filterStatus = ref('')

async function loadCourses() {
  loading.value = true
  try {
    const params: any = { pageSize: 100 }
    if (filterStatus.value) params.status = filterStatus.value
    const res: any = await api.get('/courses', { params })
    if (res.code === 200) courses.value = res.data.list
  } finally { loading.value = false }
}

async function review(id: number, status: string) {
  const res: any = await api.put(`/courses/${id}/review`, { status })
  if (res.code === 200) { ElMessage.success(res.message); loadCourses() }
}

async function deleteCourse(id: number) {
  const res: any = await api.delete(`/courses/${id}`)
  if (res.code === 200) { ElMessage.success('删除成功'); loadCourses() }
}

onMounted(loadCourses)
</script>
