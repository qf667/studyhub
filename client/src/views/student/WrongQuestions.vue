<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>错题本</span>
          <el-radio-group v-model="filterMastered" @change="loadWrongQuestions">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="0">未掌握</el-radio-button>
            <el-radio-button label="1">已掌握</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <div v-for="q in wrongQuestions" :key="q.id" style="margin-bottom: 16px; padding: 16px; border: 1px solid #eee; border-radius: 8px">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px">
          <div>
            <el-tag size="small" style="margin-right: 8px">
              {{ { single_choice: '单选', multiple_choice: '多选', true_false: '判断', fill_blank: '填空', short_answer: '简答' }[q.type as string] }}
            </el-tag>
            <span style="color: #999; font-size: 12px">{{ q.course_name }}</span>
          </div>
          <el-tag :type="q.is_mastered ? 'success' : 'danger'" size="small">
            {{ q.is_mastered ? '已掌握' : '未掌握' }}
          </el-tag>
        </div>

        <p style="font-weight: bold; margin-bottom: 8px">{{ q.content }}</p>

        <div v-if="q.options" style="margin-bottom: 8px">
          <p v-for="opt in (typeof q.options === 'string' ? JSON.parse(q.options) : q.options)" :key="opt" style="margin: 2px 0; color: #666">{{ opt }}</p>
        </div>

        <div style="background: #fef0f0; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px">
          <p style="color: #f56c6c; margin: 0"><strong>你的答案：</strong>{{ q.wrong_answer }}</p>
        </div>
        <div style="background: #f0f9eb; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px">
          <p style="color: #67c23a; margin: 0"><strong>正确答案：</strong>{{ q.answer }}</p>
        </div>
        <div v-if="q.explanation" style="background: #f4f4f5; padding: 8px 12px; border-radius: 4px">
          <p style="color: #666; margin: 0"><strong>解析：</strong>{{ q.explanation }}</p>
        </div>

        <div style="margin-top: 12px; text-align: right">
          <el-button v-if="!q.is_mastered" size="small" type="success" @click="markMastered(q.id)">标记已掌握</el-button>
        </div>
      </div>

      <el-empty v-if="wrongQuestions.length === 0" description="暂无错题，继续加油！" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../api'
import { ElMessage } from 'element-plus'

const wrongQuestions = ref<any[]>([])
const filterMastered = ref('')

async function loadWrongQuestions() {
  const params: any = {}
  if (filterMastered.value !== '') params.is_mastered = filterMastered.value
  const res: any = await api.get('/practice/wrong-questions', { params })
  if (res.code === 200) wrongQuestions.value = res.data
}

async function markMastered(id: number) {
  const res: any = await api.put(`/practice/wrong-questions/${id}/master`)
  if (res.code === 200) { ElMessage.success('已标记为掌握'); loadWrongQuestions() }
}

onMounted(loadWrongQuestions)
</script>
