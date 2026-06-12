<template>
  <div>
    <el-page-header @back="$router.back()" style="margin-bottom: 20px">
      <template #content><span style="font-size: 18px; font-weight: bold">{{ homework.title }}</span></template>
    </el-page-header>

    <div v-if="submitted" style="text-align: center; padding: 40px">
      <el-result icon="success" :title="`提交成功！得分：${submitResult?.score}/${homework.total_score}`" sub-title="客观题已自动批改，简答题待教师批改">
        <template #extra>
          <el-button type="primary" @click="$router.back()">返回</el-button>
        </template>
      </el-result>
    </div>

    <div v-else>
      <el-card style="margin-bottom: 20px">
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div>
            <span style="color: #999">课程：{{ homework.course_name }}</span>
            <span style="color: #999; margin-left: 20px">截止时间：{{ homework.deadline }}</span>
            <span style="color: #999; margin-left: 20px">总分：{{ homework.total_score }}</span>
          </div>
          <el-button type="primary" @click="submitHomework" :loading="submitting">提交作业</el-button>
        </div>
      </el-card>

      <!-- 题目导航 -->
      <div style="margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap">
        <el-button v-for="(q, idx) in questions" :key="q.id" :type="currentIdx === idx ? 'primary' : answers[q.id] ? 'success' : 'default'" size="small" @click="currentIdx = idx">
          {{ idx + 1 }}
        </el-button>
      </div>

      <!-- 当前题目 -->
      <el-card v-if="currentQuestion">
        <div style="margin-bottom: 16px">
          <el-tag :type="{ single_choice: '', multiple_choice: 'warning', true_false: 'success', fill_blank: 'info', short_answer: 'danger' }[currentQuestion.type as string]" size="small" style="margin-right: 8px">
            {{ { single_choice: '单选题', multiple_choice: '多选题', true_false: '判断题', fill_blank: '填空题', short_answer: '简答题' }[currentQuestion.type as string] }}
          </el-tag>
          <el-tag :type="{ easy: 'success', medium: 'warning', hard: 'danger' }[currentQuestion.difficulty as string]" size="small">
            {{ { easy: '简单', medium: '中等', hard: '困难' }[currentQuestion.difficulty as string] }}
          </el-tag>
          <span style="float: right; color: #999">分值：{{ currentQuestion.hw_score || currentQuestion.score }}</span>
        </div>

        <h3 style="margin-bottom: 16px">{{ currentQuestion.content }}</h3>

        <div v-if="currentQuestion.type === 'single_choice'">
          <el-radio-group v-model="answers[currentQuestion.id]" style="display: flex; flex-direction: column; gap: 8px">
            <el-radio v-for="opt in currentQuestion.options" :key="opt" :label="opt" border style="margin: 0; width: 100%; padding: 12px">{{ opt }}</el-radio>
          </el-radio-group>
        </div>

        <div v-else-if="currentQuestion.type === 'multiple_choice'">
          <el-checkbox-group v-model="answers[currentQuestion.id]" style="display: flex; flex-direction: column; gap: 8px">
            <el-checkbox v-for="opt in currentQuestion.options" :key="opt" :label="opt" border style="margin: 0; width: 100%; padding: 12px">{{ opt }}</el-checkbox>
          </el-checkbox-group>
        </div>

        <div v-else-if="currentQuestion.type === 'true_false'">
          <el-radio-group v-model="answers[currentQuestion.id]" style="display: flex; gap: 16px">
            <el-radio label="正确" border style="padding: 12px 40px">正确</el-radio>
            <el-radio label="错误" border style="padding: 12px 40px">错误</el-radio>
          </el-radio-group>
        </div>

        <div v-else>
          <el-input v-model="answers[currentQuestion.id]" type="textarea" :rows="3" placeholder="请输入你的答案" />
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: space-between">
          <el-button :disabled="currentIdx === 0" @click="currentIdx--">上一题</el-button>
          <el-button :disabled="currentIdx >= questions.length - 1" @click="currentIdx++">下一题</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const homeworkId = Number(route.params.id)

const homework = ref<any>({})
const questions = ref<any[]>([])
const currentIdx = ref(0)
const answers = reactive<Record<number, any>>({})
const submitted = ref(false)
const submitting = ref(false)
const submitResult = ref<any>(null)

const currentQuestion = computed(() => questions.value[currentIdx.value])

async function loadHomework() {
  const res: any = await api.get(`/homework/${homeworkId}`)
  if (res.code === 200) {
    homework.value = res.data
    questions.value = res.data.questions || []
    // Initialize answers
    for (const q of questions.value) {
      if (q.type === 'multiple_choice') answers[q.id] = []
      else answers[q.id] = ''
    }
  }
}

async function submitHomework() {
  const unanswered = questions.value.filter(q => {
    const a = answers[q.id]
    return !a || (Array.isArray(a) && a.length === 0) || (typeof a === 'string' && !a.trim())
  })
  if (unanswered.length > 0) {
    try {
      await ElMessageBox.confirm(`还有${unanswered.length}题未作答，确定提交吗？`, '提示', { type: 'warning' })
    } catch { return }
  }
  submitting.value = true
  try {
    const formatted: Record<number, string> = {}
    for (const [k, v] of Object.entries(answers)) {
      formatted[Number(k)] = Array.isArray(v) ? v.join(',') : v
    }
    const res: any = await api.post(`/homework/${homeworkId}/submit`, { answers: formatted })
    if (res.code === 200) {
      submitted.value = true
      submitResult.value = res.data
    } else {
      ElMessage.error(res.message)
    }
  } finally { submitting.value = false }
}

onMounted(loadHomework)
</script>
