<template>
  <div>
    <el-page-header @back="$router.back()" style="margin-bottom: 20px">
      <template #content><span style="font-size: 18px; font-weight: bold">作业批改</span></template>
    </el-page-header>

    <el-card>
      <template #header>
        <span>{{ homework.title }} - 提交列表</span>
      </template>
      <el-table :data="submissions" stripe>
        <el-table-column prop="student_name" label="学生姓名" width="120" />
        <el-table-column prop="class_name" label="班级" width="120" />
        <el-table-column prop="score" label="得分" width="80">
          <template #default="{ row }">{{ row.score ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="{ in_progress: 'info', submitted: 'warning', graded: 'success' }[row.status as string]" size="small">
              {{ { in_progress: '进行中', submitted: '待批改', graded: '已批改' }[row.status as string] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitted_at" label="提交时间" width="170" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">查看详情</el-button>
            <el-button size="small" type="success" v-if="row.status === 'submitted'" @click="showGradeDialog(row)">批改</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="提交详情" width="700">
      <div v-if="currentSubmission">
        <p><strong>学生：</strong>{{ currentSubmission.student_name }}</p>
        <p><strong>得分：</strong>{{ currentSubmission.score }}</p>
        <p><strong>状态：</strong>{{ currentSubmission.status }}</p>
        <el-divider />
        <div v-for="(answer, qId) in currentSubmission.answers" :key="qId" style="margin-bottom: 12px">
          <p style="font-weight: bold">题目 #{{ qId }}</p>
          <p>学生答案：{{ answer }}</p>
        </div>
      </div>
    </el-dialog>

    <!-- 批改对话框 -->
    <el-dialog v-model="showGradeDialogVisible" title="批改" width="400">
      <el-form label-width="60px">
        <el-form-item label="分数">
          <el-input-number v-model="gradeScore" :min="0" :max="homework.total_score || 100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGradeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitGrade">确认批改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const homeworkId = Number(route.params.id)
const homework = ref<any>({})
const submissions = ref<any[]>([])
const showDetailDialog = ref(false)
const showGradeDialogVisible = ref(false)
const currentSubmission = ref<any>(null)
const gradeScore = ref(0)

async function loadHomework() {
  const res: any = await api.get(`/homework/${homeworkId}`)
  if (res.code === 200) homework.value = res.data
}

async function loadSubmissions() {
  const res: any = await api.get(`/homework/${homeworkId}/submissions`)
  if (res.code === 200) submissions.value = res.data
}

function viewDetail(sub: any) {
  currentSubmission.value = sub
  showDetailDialog.value = true
}

function showGradeDialog(sub: any) {
  currentSubmission.value = sub
  gradeScore.value = sub.score || 0
  showGradeDialogVisible.value = true
}

async function submitGrade() {
  const res: any = await api.put(`/homework/submissions/${currentSubmission.value.id}/grade`, { score: gradeScore.value })
  if (res.code === 200) {
    ElMessage.success('批改完成')
    showGradeDialogVisible.value = false
    loadSubmissions()
  }
}

onMounted(() => {
  loadHomework()
  loadSubmissions()
})
</script>
