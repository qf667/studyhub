<template>
  <div style="display: flex; flex-direction: column; height: calc(100vh - 140px)">
    <el-card style="flex: 1; display: flex; flex-direction: column">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>AI智能问答</span>
          <div>
            <el-select v-model="courseId" placeholder="选择课程（可选）" clearable style="width: 200px; margin-right: 10px">
              <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button size="small" @click="clearHistory">清空历史</el-button>
          </div>
        </div>
      </template>

      <div ref="chatContainer" style="flex: 1; overflow-y: auto; padding: 10px; min-height: 400px">
        <div v-for="msg in messages" :key="msg.id" :style="{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '16px' }">
          <div :style="{
            maxWidth: '70%',
            padding: '12px 16px',
            borderRadius: '12px',
            background: msg.role === 'user' ? '#409EFF' : '#f4f4f5',
            color: msg.role === 'user' ? '#fff' : '#333',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6'
          }">
            {{ msg.content }}
          </div>
        </div>
        <div v-if="loading" style="display: flex; justify-content: flex-start; margin-bottom: 16px">
          <div style="padding: 12px 16px; border-radius: 12px; background: #f4f4f5; color: #999">
            <el-icon class="is-loading"><Loading /></el-icon> AI正在思考...
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 10px; padding-top: 10px; border-top: 1px solid #eee">
        <el-input v-model="inputMessage" placeholder="输入你的问题..." @keyup.enter="sendMessage" :disabled="loading" />
        <el-button type="primary" @click="sendMessage" :loading="loading">发送</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import api from '../../api'

interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const loading = ref(false)
const courseId = ref<number | null>(null)
const courses = ref<any[]>([])
const chatContainer = ref<HTMLElement>()

async function loadCourses() {
  const res: any = await api.get('/courses')
  if (res.code === 200) courses.value = res.data.list
}

async function loadHistory() {
  const params: any = {}
  if (courseId.value) params.course_id = courseId.value
  const res: any = await api.get('/ai/chat/history', { params })
  if (res.code === 200) {
    messages.value = res.data.map((h: any) => ({ id: h.id, role: h.role, content: h.content }))
  }
  scrollToBottom()
}

async function sendMessage() {
  if (!inputMessage.value.trim() || loading.value) return
  const msg = inputMessage.value.trim()
  inputMessage.value = ''
  messages.value.push({ role: 'user', content: msg })
  scrollToBottom()

  loading.value = true
  try {
    const res: any = await api.post('/ai/chat', { message: msg, course_id: courseId.value })
    if (res.code === 200) {
      messages.value.push({ role: 'assistant', content: res.data.message })
    }
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

async function clearHistory() {
  await api.delete('/ai/chat/history')
  messages.value = []
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  loadCourses()
  loadHistory()
})
</script>
