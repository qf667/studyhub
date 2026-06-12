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
          <template #header><span>待完成作业</span></template>
          <el-table :data="stats.pendingHomework || []" stripe>
            <el-table-column prop="title" label="作业标题" />
            <el-table-column prop="course_name" label="课程" width="120" />
            <el-table-column prop="deadline" label="截止时间" width="170" />
            <el-table-column prop="total_score" label="总分" width="70" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="$router.push(`/student/homework/${row.id}`)">去完成</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!stats.pendingHomework?.length" description="暂无待完成作业" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12" style="margin-bottom: 12px">
        <el-card>
          <template #header><span>课程进度</span></template>
          <div v-for="course in stats.courseProgress || []" :key="course.id" style="margin-bottom: 16px">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px">
              <span>{{ course.name }}</span>
              <span style="color: #999">{{ course.completed_homework }}/{{ course.total_homework }}</span>
            </div>
            <el-progress :percentage="course.total_homework > 0 ? Math.round(course.completed_homework / course.total_homework * 100) : 0" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../api'

const stats = ref<any>({})
const cards = ref([
  { title: '我的课程', value: 0, icon: 'Reading', color: '#409EFF' },
  { title: '完成作业', value: 0, icon: 'Finished', color: '#67C23A' },
  { title: '平均分', value: 0, icon: 'TrendCharts', color: '#E6A23C' },
  { title: '待复习错题', value: 0, icon: 'Notebook', color: '#F56C6C' }
])

async function loadStats() {
  const res: any = await api.get('/stats/student')
  if (res.code === 200) {
    stats.value = res.data
    cards.value[0].value = res.data.myCourses
    cards.value[1].value = res.data.totalSubmissions
    cards.value[2].value = res.data.avgScore
    cards.value[3].value = res.data.wrongCount
  }
}

onMounted(loadStats)
</script>
