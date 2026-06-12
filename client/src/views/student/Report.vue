<template>
  <div>
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :xs="12" :sm="12" :md="6" v-for="card in cards" :key="card.title" style="margin-bottom: 12px">
        <el-card shadow="hover">
          <div style="text-align: center">
            <div style="font-size: 28px; font-weight: bold; color: var(--text-primary)">{{ card.value }}</div>
            <div style="color: var(--text-muted); font-size: 14px">{{ card.title }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :xs="24" :md="12" style="margin-bottom: 12px">
        <el-card>
          <template #header><span>成绩趋势</span></template>
          <div ref="trendChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12" style="margin-bottom: 12px">
        <el-card>
          <template #header><span>知识点掌握雷达图</span></template>
          <div ref="radarChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header><span>课程进度</span></template>
      <el-table :data="stats.courseProgress || []" stripe>
        <el-table-column prop="name" label="课程名称" />
        <el-table-column prop="subject" label="学科" width="100" />
        <el-table-column label="完成进度" width="200">
          <template #default="{ row }">
            <el-progress :percentage="row.total_homework > 0 ? Math.round(row.completed_homework / row.total_homework * 100) : 0" />
          </template>
        </el-table-column>
        <el-table-column label="完成/总数" width="100">
          <template #default="{ row }">{{ row.completed_homework }}/{{ row.total_homework }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import api from '../../api'

const stats = ref<any>({})
const trendChartRef = ref<HTMLElement>()
const radarChartRef = ref<HTMLElement>()

const cards = ref([
  { title: '我的课程', value: 0 },
  { title: '完成作业', value: 0 },
  { title: '平均分', value: 0 },
  { title: '待复习错题', value: 0 }
])

async function loadStats() {
  const res: any = await api.get('/stats/student')
  if (res.code === 200) {
    stats.value = res.data
    cards.value[0].value = res.data.myCourses
    cards.value[1].value = res.data.totalSubmissions
    cards.value[2].value = res.data.avgScore
    cards.value[3].value = res.data.wrongCount
    await nextTick()
    renderCharts(res.data)
  }
}

function renderCharts(data: any) {
  if (trendChartRef.value && data.scoreTrend?.length) {
    const chart = echarts.init(trendChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.scoreTrend.map((s: any) => s.date) },
      yAxis: { type: 'value', min: 0, max: 100 },
      series: [{
        type: 'line', data: data.scoreTrend.map((s: any) => Number(s.avg_score).toFixed(1)),
        smooth: true, areaStyle: { opacity: 0.3 },
        itemStyle: { color: '#409EFF' }
      }]
    })
  }
  if (radarChartRef.value && data.knowledgePoints?.length) {
    const chart = echarts.init(radarChartRef.value)
    const indicators = data.knowledgePoints.map((k: any) => ({ name: k.knowledge_point, max: k.total }))
    const values = data.knowledgePoints.map((k: any) => k.total - k.wrong_count)
    chart.setOption({
      tooltip: {},
      radar: { indicator: indicators },
      series: [{ type: 'radar', data: [{ value: values, name: '掌握程度' }] }]
    })
  }
}

onMounted(loadStats)
</script>
