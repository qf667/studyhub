<template>
  <div>
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :xs="12" :sm="12" :md="6" v-for="card in cards" :key="card.title" style="margin-bottom: 12px">
        <el-card shadow="hover">
          <div style="display: flex; align-items: center; gap: 16px">
            <el-icon :size="40" :color="card.color"><component :is="card.icon" /></el-icon>
            <div>
              <div style="font-size: 28px; font-weight: bold; color: var(--text-primary)">{{ card.value }}</div>
              <div style="color: var(--text-muted); font-size: 14px">{{ card.title }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :xs="24" :md="12" style="margin-bottom: 12px">
        <el-card>
          <template #header><span>用户角色分布</span></template>
          <div ref="roleChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12" style="margin-bottom: 12px">
        <el-card>
          <template #header><span>学科课程分布</span></template>
          <div ref="subjectChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header><span>待审核课程</span></template>
          <el-table :data="pendingCourses" stripe>
            <el-table-column prop="name" label="课程名称" />
            <el-table-column prop="teacher_name" label="教师" width="120" />
            <el-table-column prop="subject" label="学科" width="120" />
            <el-table-column prop="created_at" label="创建时间" width="180" />
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button type="success" size="small" @click="reviewCourse(row.id, 'approved')">通过</el-button>
                <el-button type="danger" size="small" @click="reviewCourse(row.id, 'rejected')">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import api from '../../api'
import { ElMessage } from 'element-plus'

const stats = ref<any>({})
const pendingCourses = ref<any[]>([])
const roleChartRef = ref<HTMLElement>()
const subjectChartRef = ref<HTMLElement>()

const cards = ref([
  { title: '总用户数', value: 0, icon: 'User', color: '#409EFF' },
  { title: '课程总数', value: 0, icon: 'Reading', color: '#67C23A' },
  { title: '作业总数', value: 0, icon: 'Document', color: '#E6A23C' },
  { title: '提交总数', value: 0, icon: 'Finished', color: '#F56C6C' }
])

async function loadStats() {
  const res: any = await api.get('/stats/admin')
  if (res.code === 200) {
    stats.value = res.data
    cards.value[0].value = res.data.totalUsers
    cards.value[1].value = res.data.totalCourses
    cards.value[2].value = res.data.totalHomework
    cards.value[3].value = res.data.totalSubmissions

    await nextTick()
    renderCharts(res.data)
  }
}

async function loadPendingCourses() {
  const res: any = await api.get('/courses', { params: { status: 'pending', pageSize: 10 } })
  if (res.code === 200) pendingCourses.value = res.data.list
}

function renderCharts(data: any) {
  if (roleChartRef.value) {
    const chart = echarts.init(roleChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        data: [
          { value: data.totalStudents, name: '学生' },
          { value: data.totalTeachers, name: '教师' },
          { value: data.totalUsers - data.totalStudents - data.totalTeachers, name: '管理员' }
        ],
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }
      }]
    })
  }
  if (subjectChartRef.value && data.subjectDistribution?.length) {
    const chart = echarts.init(subjectChartRef.value)
    chart.setOption({
      tooltip: {},
      xAxis: { type: 'category', data: data.subjectDistribution.map((s: any) => s.subject) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.subjectDistribution.map((s: any) => s.count), itemStyle: { borderRadius: [4, 4, 0, 0] } }]
    })
  }
}

async function reviewCourse(id: number, status: string) {
  const res: any = await api.put(`/courses/${id}/review`, { status })
  if (res.code === 200) {
    ElMessage.success(res.message)
    loadPendingCourses()
  }
}

onMounted(() => {
  loadStats()
  loadPendingCourses()
})
</script>
