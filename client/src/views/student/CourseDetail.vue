<template>
  <div>
    <el-page-header @back="$router.push('/student/courses')" style="margin-bottom: 20px">
      <template #content><span style="font-size: 18px; font-weight: bold">{{ course.name }}</span></template>
    </el-page-header>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="教材" name="materials">
        <el-card>
          <el-table :data="materials" stripe>
            <el-table-column prop="title" label="教材名称" />
            <el-table-column prop="file_type" label="类型" width="80" />
            <el-table-column prop="created_at" label="上传时间" width="170" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" @click="viewChapters(row)">查看章节</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="materials.length === 0" description="暂无教材" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="作业" name="homework">
        <el-card>
          <el-table :data="homeworkList" stripe>
            <el-table-column prop="title" label="作业标题" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="isCompleted(row.id) ? 'success' : 'warning'" size="small">
                  {{ isCompleted(row.id) ? '已完成' : '待完成' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="total_score" label="总分" width="70" />
            <el-table-column prop="deadline" label="截止时间" width="170" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="$router.push(`/student/homework/${row.id}`)">
                  {{ isCompleted(row.id) ? '查看' : '去完成' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="在线练习" name="practice">
        <el-card>
          <template #header><span>选择练习模式</span></template>
          <el-form label-width="80px" style="max-width: 400px; margin-bottom: 20px">
            <el-form-item label="难度">
              <el-radio-group v-model="practiceForm.difficulty">
                <el-radio label="">全部</el-radio>
                <el-radio label="easy">简单</el-radio>
                <el-radio label="medium">中等</el-radio>
                <el-radio label="hard">困难</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="题数">
              <el-input-number v-model="practiceForm.count" :min="1" :max="20" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="startPractice">开始练习</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 章节对话框 -->
    <el-dialog v-model="showChapterDialog" :title="currentMaterial?.title" width="600">
      <el-timeline>
        <el-timeline-item v-for="ch in chapters" :key="ch.id" :timestamp="`第${ch.sort_order}章`" placement="top">
          <el-card>
            <h4>{{ ch.title }}</h4>
            <p style="color: #666">{{ ch.content }}</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>

    <!-- 练习对话框 -->
    <el-dialog v-model="showPracticeDialog" title="在线练习" width="700" :close-on-click-modal="false">
      <div v-if="practiceQuestions.length > 0">
        <div v-for="(q, idx) in practiceQuestions" :key="q.id" style="margin-bottom: 20px; padding: 16px; border: 1px solid #eee; border-radius: 8px">
          <p style="font-weight: bold; margin-bottom: 8px">{{ idx + 1 }}. {{ q.content }}</p>
          <div v-if="q.type === 'single_choice' || q.type === 'multiple_choice'">
            <el-radio-group v-model="practiceAnswers[q.id]" v-if="q.type === 'single_choice'">
              <el-radio v-for="opt in q.options" :key="opt" :label="opt" style="display: block; margin: 4px 0">{{ opt }}</el-radio>
            </el-radio-group>
            <el-checkbox-group v-model="practiceAnswers[q.id]" v-else>
              <el-checkbox v-for="opt in q.options" :key="opt" :label="opt" style="display: block; margin: 4px 0">{{ opt }}</el-checkbox>
            </el-checkbox-group>
          </div>
          <div v-else-if="q.type === 'true_false'">
            <el-radio-group v-model="practiceAnswers[q.id]">
              <el-radio label="正确">正确</el-radio>
              <el-radio label="错误">错误</el-radio>
            </el-radio-group>
          </div>
          <div v-else>
            <el-input v-model="practiceAnswers[q.id]" placeholder="请输入答案" />
          </div>
        </div>
        <el-button type="primary" @click="submitPractice">提交答案</el-button>
      </div>
      <div v-if="practiceResult">
        <el-result :icon="practiceResult.accuracy >= 60 ? 'success' : 'warning'" :title="`正确率：${practiceResult.accuracy}%`" :sub-title="`答对${practiceResult.correct}/${practiceResult.total}题`">
          <template #extra>
            <el-button type="primary" @click="showPracticeDialog = false">关闭</el-button>
          </template>
        </el-result>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const courseId = Number(route.params.id)
const activeTab = ref('materials')

const course = ref<any>({})
const materials = ref<any[]>([])
const homeworkList = ref<any[]>([])
const submissions = ref<any[]>([])
const chapters = ref<any[]>([])
const currentMaterial = ref<any>(null)
const showChapterDialog = ref(false)
const showPracticeDialog = ref(false)
const practiceQuestions = ref<any[]>([])
const practiceAnswers = ref<Record<number, any>>({})
const practiceResult = ref<any>(null)
const practiceForm = reactive({ difficulty: '', count: 5 })

async function loadCourse() {
  const res: any = await api.get(`/courses/${courseId}`)
  if (res.code === 200) course.value = res.data
}
async function loadMaterials() {
  const res: any = await api.get('/materials', { params: { course_id: courseId } })
  if (res.code === 200) materials.value = res.data
}
async function loadHomework() {
  const res: any = await api.get('/homework', { params: { course_id: courseId } })
  if (res.code === 200) homeworkList.value = res.data
}
async function loadSubmissions() {
  const res: any = await api.get('/homework/submissions/mine')
  if (res.code === 200) submissions.value = res.data
}

function isCompleted(homeworkId: number) {
  return submissions.value.some(s => s.homework_id === homeworkId)
}

async function viewChapters(material: any) {
  currentMaterial.value = material
  const res: any = await api.get(`/materials/${material.id}/chapters`)
  if (res.code === 200) chapters.value = res.data
  showChapterDialog.value = true
}

async function startPractice() {
  const res: any = await api.post('/practice/start', {
    course_id: courseId,
    difficulty: practiceForm.difficulty || undefined,
    count: practiceForm.count
  })
  if (res.code === 200) {
    practiceQuestions.value = res.data
    practiceAnswers.value = {}
    practiceResult.value = null
    // Initialize checkbox answers as arrays
    for (const q of practiceQuestions.value) {
      if (q.type === 'multiple_choice') practiceAnswers.value[q.id] = []
    }
    showPracticeDialog.value = true
  }
}

async function submitPractice() {
  const answers = practiceQuestions.value.map(q => ({
    question_id: q.id,
    user_answer: Array.isArray(practiceAnswers.value[q.id])
      ? practiceAnswers.value[q.id].join(',')
      : practiceAnswers.value[q.id] || ''
  }))
  const res: any = await api.post('/practice/submit', { answers, course_id: courseId })
  if (res.code === 200) {
    practiceResult.value = res.data
    ElMessage.success(`正确率：${res.data.accuracy}%`)
  }
}

onMounted(() => {
  loadCourse()
  loadMaterials()
  loadHomework()
  loadSubmissions()
})
</script>
