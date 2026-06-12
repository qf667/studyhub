<template>
  <div>
    <el-card>
      <template #header><span>AI智能出题</span></template>

      <el-steps :active="step" finish-status="success" style="margin-bottom: 30px">
        <el-step title="选择课程与章节" />
        <el-step title="配置出题参数" />
        <el-step title="预览与保存" />
      </el-steps>

      <!-- Step 1: 选择课程与章节 -->
      <div v-if="step === 0">
        <el-form label-width="100px">
          <el-form-item label="选择课程">
            <el-select v-model="form.course_id" placeholder="请选择课程" @change="loadMaterials" style="width: 300px">
              <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="选择教材" v-if="materials.length">
            <el-select v-model="form.material_id" placeholder="请选择教材" @change="loadChapters" style="width: 300px">
              <el-option v-for="m in materials" :key="m.id" :label="m.title" :value="m.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="选择章节" v-if="chapters.length">
            <el-select v-model="form.chapter_id" placeholder="请选择章节" style="width: 300px">
              <el-option v-for="ch in chapters" :key="ch.id" :label="ch.title" :value="ch.id" />
            </el-select>
          </el-form-item>
        </el-form>
        <el-button type="primary" @click="step = 1" :disabled="!form.course_id">下一步</el-button>
      </div>

      <!-- Step 2: 配置参数 -->
      <div v-if="step === 1">
        <el-form label-width="100px" style="max-width: 500px">
          <el-form-item label="题型">
            <el-checkbox-group v-model="form.types">
              <el-checkbox label="single_choice">单选题</el-checkbox>
              <el-checkbox label="multiple_choice">多选题</el-checkbox>
              <el-checkbox label="true_false">判断题</el-checkbox>
              <el-checkbox label="fill_blank">填空题</el-checkbox>
              <el-checkbox label="short_answer">简答题</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="难度">
            <el-radio-group v-model="form.difficulty">
              <el-radio label="easy">简单</el-radio>
              <el-radio label="medium">中等</el-radio>
              <el-radio label="hard">困难</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="每类型数量">
            <el-input-number v-model="form.count" :min="1" :max="10" />
          </el-form-item>
        </el-form>
        <el-button @click="step = 0">上一步</el-button>
        <el-button type="primary" :loading="generating" @click="generate">生成习题</el-button>
      </div>

      <!-- Step 3: 预览 -->
      <div v-if="step === 2">
        <el-alert :title="`AI已生成 ${generatedQuestions.length} 道习题`" type="success" :closable="false" style="margin-bottom: 16px" />

        <el-table :data="generatedQuestions" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="content" label="题目" show-overflow-tooltip />
          <el-table-column prop="type" label="题型" width="90">
            <template #default="{ row }">
              {{ { single_choice: '单选', multiple_choice: '多选', true_false: '判断', fill_blank: '填空', short_answer: '简答' }[row.type as string] }}
            </template>
          </el-table-column>
          <el-table-column prop="answer" label="答案" width="100" />
          <el-table-column prop="explanation" label="解析" show-overflow-tooltip />
          <el-table-column label="操作" width="120">
            <template #default="{ $index }">
              <el-button size="small" type="danger" @click="generatedQuestions.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 20px">
          <el-button @click="step = 1">返回修改</el-button>
          <el-button type="primary" :loading="saving" @click="saveQuestions">保存到题库</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import { ElMessage } from 'element-plus'

const step = ref(0)
const generating = ref(false)
const saving = ref(false)
const courses = ref<any[]>([])
const materials = ref<any[]>([])
const chapters = ref<any[]>([])
const generatedQuestions = ref<any[]>([])

const form = reactive({
  course_id: null as number | null,
  material_id: null as number | null,
  chapter_id: null as number | null,
  types: ['single_choice'],
  difficulty: 'medium',
  count: 3
})

async function loadCourses() {
  const res: any = await api.get('/courses')
  if (res.code === 200) courses.value = res.data.list
}

async function loadMaterials() {
  form.material_id = null
  form.chapter_id = null
  const res: any = await api.get('/materials', { params: { course_id: form.course_id } })
  if (res.code === 200) materials.value = res.data
}

async function loadChapters() {
  form.chapter_id = null
  const res: any = await api.get(`/materials/${form.material_id}/chapters`)
  if (res.code === 200) chapters.value = res.data
}

async function generate() {
  generating.value = true
  try {
    const res: any = await api.post('/ai/generate-questions', {
      course_id: form.course_id,
      material_id: form.material_id,
      chapter_id: form.chapter_id,
      difficulty: form.difficulty,
      count: form.count
    })
    if (res.code === 200) {
      // Filter by selected types
      generatedQuestions.value = res.data.questions.filter((q: any) => form.types.includes(q.type))
      step.value = 2
    }
  } finally { generating.value = false }
}

async function saveQuestions() {
  saving.value = true
  try {
    const res: any = await api.post('/ai/save-questions', {
      questions: generatedQuestions.value,
      course_id: form.course_id,
      material_id: form.material_id,
      chapter_id: form.chapter_id
    })
    if (res.code === 200) {
      ElMessage.success(res.message)
      step.value = 0
      generatedQuestions.value = []
    }
  } finally { saving.value = false }
}

onMounted(loadCourses)
</script>
