<template>
  <div>
    <el-page-header @back="$router.push('/teacher')" style="margin-bottom: 20px">
      <template #content>
        <span style="font-size: 18px; font-weight: bold">{{ course.name }}</span>
        <el-tag :type="{ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger' }[course.status as string]" size="small" style="margin-left: 12px">
          {{ { draft: '草稿', pending: '待审核', approved: '已通过', rejected: '已拒绝' }[course.status as string] }}
        </el-tag>
      </template>
    </el-page-header>

    <el-tabs v-model="activeTab">
      <!-- 教材管理 -->
      <el-tab-pane label="教材管理" name="materials">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>教材列表</span>
              <el-upload action="/api/v1/materials/upload" :data="{ course_id: courseId }" :headers="uploadHeaders" :on-success="onUploadSuccess" :show-file-list="false" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx">
                <el-button type="primary">上传教材</el-button>
              </el-upload>
            </div>
          </template>
          <el-table :data="materials" stripe>
            <el-table-column prop="title" label="教材名称" />
            <el-table-column prop="file_type" label="类型" width="80" />
            <el-table-column prop="uploader_name" label="上传者" width="100" />
            <el-table-column prop="created_at" label="上传时间" width="170" />
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button size="small" @click="viewChapters(row)">查看章节</el-button>
                <el-popconfirm title="确定删除？" @confirm="deleteMaterial(row.id)">
                  <template #reference><el-button size="small" type="danger">删除</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 习题库 -->
      <el-tab-pane label="习题库" name="questions">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>习题列表</span>
              <el-button @click="$router.push('/teacher/ai-questions')">AI出题</el-button>
            </div>
          </template>
          <el-table :data="questions" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="content" label="题目" show-overflow-tooltip />
            <el-table-column prop="type" label="题型" width="100">
              <template #default="{ row }">
                {{ { single_choice: '单选', multiple_choice: '多选', true_false: '判断', fill_blank: '填空', short_answer: '简答' }[row.type as string] }}
              </template>
            </el-table-column>
            <el-table-column prop="difficulty" label="难度" width="80">
              <template #default="{ row }">
                <el-tag :type="{ easy: 'success', medium: 'warning', hard: 'danger' }[row.difficulty as string]" size="small">
                  {{ { easy: '简单', medium: '中等', hard: '困难' }[row.difficulty as string] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="score" label="分值" width="70" />
            <el-table-column prop="source" label="来源" width="70">
              <template #default="{ row }">
                <el-tag :type="row.source === 'ai' ? 'primary' : 'info'" size="small">{{ row.source === 'ai' ? 'AI' : '手动' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 作业管理 -->
      <el-tab-pane label="作业管理" name="homework">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>作业列表</span>
              <el-button type="primary" @click="showHomeworkDialog = true">创建作业</el-button>
            </div>
          </template>
          <el-table :data="homeworkList" stripe>
            <el-table-column prop="title" label="作业标题" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="{ draft: 'info', published: 'success', closed: 'danger' }[row.status as string]" size="small">
                  {{ { draft: '草稿', published: '已发布', closed: '已关闭' }[row.status as string] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="total_score" label="总分" width="70" />
            <el-table-column prop="deadline" label="截止时间" width="170" />
            <el-table-column label="操作" width="280">
              <template #default="{ row }">
                <el-button size="small" type="success" v-if="row.status === 'draft'" @click="publishHomework(row.id)">发布</el-button>
                <el-button size="small" @click="$router.push(`/teacher/homework/${row.id}/grade`)">查看提交</el-button>
                <el-popconfirm title="确定删除？" @confirm="deleteHomework(row.id)">
                  <template #reference><el-button size="small" type="danger">删除</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 学情分析 -->
      <el-tab-pane label="学情分析" name="analytics">
        <el-row :gutter="20">
          <el-col :xs="24" :md="12" style="margin-bottom: 12px">
            <el-card>
              <template #header><span>学生成绩分布</span></template>
              <div ref="scoreChartRef" style="height: 300px"></div>
            </el-card>
          </el-col>
          <el-col :xs="24" :md="12" style="margin-bottom: 12px">
            <el-card>
              <template #header><span>知识点薄弱分析</span></template>
              <div ref="weakChartRef" style="height: 300px"></div>
            </el-card>
          </el-col>
        </el-row>
        <el-card style="margin-top: 20px">
          <template #header><span>学生列表</span></template>
          <el-table :data="students" stripe>
            <el-table-column prop="real_name" label="姓名" />
            <el-table-column prop="class_name" label="班级" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column prop="assigned_at" label="分配时间" width="170" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 章节查看对话框 -->
    <el-dialog v-model="showChapterDialog" :title="currentMaterial?.title + ' - 章节列表'" width="600">
      <el-table :data="chapters" stripe>
        <el-table-column prop="sort_order" label="序号" width="60" />
        <el-table-column prop="title" label="章节标题" />
        <el-table-column prop="content" label="内容摘要" show-overflow-tooltip />
      </el-table>
    </el-dialog>

    <!-- 创建作业对话框 -->
    <el-dialog v-model="showHomeworkDialog" title="创建作业" width="700">
      <el-form :model="homeworkForm" label-width="80px">
        <el-form-item label="作业标题"><el-input v-model="homeworkForm.title" /></el-form-item>
        <el-form-item label="作业描述"><el-input v-model="homeworkForm.description" type="textarea" /></el-form-item>
        <el-form-item label="截止时间"><el-date-picker v-model="homeworkForm.deadline" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
        <el-form-item label="限时(分钟)"><el-input-number v-model="homeworkForm.time_limit" :min="0" /></el-form-item>
        <el-form-item label="允许重做"><el-switch v-model="homeworkForm.allow_retry" /></el-form-item>
        <el-form-item label="选择题目">
          <el-select v-model="homeworkForm.question_ids" multiple placeholder="选择题目" style="width: 100%">
            <el-option v-for="q in allQuestions" :key="q.id" :label="`#${q.id} ${q.content?.substring(0, 40)}`" :value="q.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showHomeworkDialog = false">取消</el-button>
        <el-button type="primary" @click="createHomework">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import api from '../../api'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const auth = useAuthStore()
const courseId = computed(() => Number(route.params.id))
const activeTab = ref('materials')

const course = ref<any>({})
const materials = ref<any[]>([])
const questions = ref<any[]>([])
const homeworkList = ref<any[]>([])
const students = ref<any[]>([])
const chapters = ref<any[]>([])
const allQuestions = ref<any[]>([])

const showChapterDialog = ref(false)
const showHomeworkDialog = ref(false)
const currentMaterial = ref<any>(null)
const scoreChartRef = ref<HTMLElement>()
const weakChartRef = ref<HTMLElement>()

const uploadHeaders = computed(() => ({ Authorization: `Bearer ${auth.token}` }))

const homeworkForm = reactive({
  title: '', description: '', deadline: '', time_limit: 0, allow_retry: false, question_ids: [] as number[]
})

async function loadCourse() {
  const res: any = await api.get(`/courses/${courseId.value}`)
  if (res.code === 200) course.value = res.data
}

async function loadMaterials() {
  const res: any = await api.get('/materials', { params: { course_id: courseId.value } })
  if (res.code === 200) materials.value = res.data
}

async function loadQuestions() {
  const res: any = await api.get('/questions', { params: { course_id: courseId.value, pageSize: 200 } })
  if (res.code === 200) {
    questions.value = res.data.list
    allQuestions.value = res.data.list
  }
}

async function loadHomework() {
  const res: any = await api.get('/homework', { params: { course_id: courseId.value } })
  if (res.code === 200) homeworkList.value = res.data
}

async function loadStudents() {
  const res: any = await api.get(`/courses/${courseId.value}/students`)
  if (res.code === 200) students.value = res.data
}

function onUploadSuccess(res: any) {
  if (res.code === 200) { ElMessage.success('上传成功'); loadMaterials() }
  else ElMessage.error(res.message)
}

async function viewChapters(material: any) {
  currentMaterial.value = material
  const res: any = await api.get(`/materials/${material.id}/chapters`)
  if (res.code === 200) chapters.value = res.data
  showChapterDialog.value = true
}

async function deleteMaterial(id: number) {
  const res: any = await api.delete(`/materials/${id}`)
  if (res.code === 200) { ElMessage.success('删除成功'); loadMaterials() }
}

async function publishHomework(id: number) {
  const res: any = await api.post(`/homework/${id}/publish`)
  if (res.code === 200) { ElMessage.success('发布成功'); loadHomework() }
}

async function deleteHomework(id: number) {
  const res: any = await api.delete(`/homework/${id}`)
  if (res.code === 200) { ElMessage.success('删除成功'); loadHomework() }
}

async function createHomework() {
  if (!homeworkForm.title || !homeworkForm.deadline) { ElMessage.warning('请填写标题和截止时间'); return }
  const res: any = await api.post('/homework', { ...homeworkForm, course_id: courseId.value })
  if (res.code === 200) { ElMessage.success('创建成功'); showHomeworkDialog.value = false; loadHomework() }
}

function renderCharts() {
  if (scoreChartRef.value) {
    const chart = echarts.init(scoreChartRef.value)
    chart.setOption({
      tooltip: {},
      xAxis: { type: 'category', data: ['优秀', '良好', '中等', '及格', '不及格'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [5, 12, 8, 3, 2], itemStyle: { color: '#409EFF', borderRadius: [4, 4, 0, 0] } }]
    })
  }
  if (weakChartRef.value) {
    const chart = echarts.init(weakChartRef.value)
    chart.setOption({
      tooltip: {},
      xAxis: { type: 'category', data: ['知识点A', '知识点B', '知识点C', '知识点D', '知识点E'] },
      yAxis: { type: 'value', name: '错误次数' },
      series: [{ type: 'bar', data: [15, 12, 9, 7, 5], itemStyle: { color: '#F56C6C', borderRadius: [4, 4, 0, 0] } }]
    })
  }
}

onMounted(async () => {
  await loadCourse()
  loadMaterials()
  loadQuestions()
  loadHomework()
  loadStudents()
  await nextTick()
  renderCharts()
})
</script>
