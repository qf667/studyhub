<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>用户管理</span>
          <div style="display: flex; gap: 10px">
            <el-button type="primary" @click="showAddDialog = true">新增用户</el-button>
            <el-button @click="showImportDialog = true">批量导入</el-button>
          </div>
        </div>
      </template>

      <el-form inline style="margin-bottom: 16px">
        <el-form-item label="搜索">
          <el-input v-model="query.keyword" placeholder="用户名/姓名/邮箱" clearable @clear="loadUsers" @keyup.enter="loadUsers" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="query.role" clearable @change="loadUsers" style="width: 120px">
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
            <el-option label="学生" value="student" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable @change="loadUsers" style="width: 100px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadUsers">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="users" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="real_name" label="姓名" width="100" />
        <el-table-column prop="role" label="角色" width="80">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'teacher' ? 'warning' : 'success'" size="small">
              {{ { admin: '管理员', teacher: '教师', student: '学生' }[row.role as string] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="class_name" label="班级" width="120" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-switch :model-value="row.status === 1" @change="(v: boolean) => toggleStatus(row.id, v)" />
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="editUser(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="deleteUser(row.id)">
              <template #reference><el-button size="small" type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end"
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadUsers"
        @size-change="loadUsers"
      />
    </el-card>

    <!-- 新增/编辑用户对话框 -->
    <el-dialog v-model="showAddDialog" :title="editingUser ? '编辑用户' : '新增用户'" width="500">
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="用户名"><el-input v-model="userForm.username" :disabled="!!editingUser" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="userForm.real_name" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="userForm.email" /></el-form-item>
        <el-form-item label="手机"><el-input v-model="userForm.phone" /></el-form-item>
        <el-form-item label="密码" v-if="!editingUser"><el-input v-model="userForm.password" type="password" show-password /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
            <el-option label="学生" value="student" />
          </el-select>
        </el-form-item>
        <el-form-item label="班级" v-if="userForm.role === 'student'"><el-input v-model="userForm.class_name" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入用户" width="600">
      <el-alert title="每行一个用户，格式：用户名,姓名,邮箱,角色(student/teacher),班级" type="info" :closable="false" style="margin-bottom: 16px" />
      <el-input v-model="importText" type="textarea" :rows="10" placeholder="zhangsan,张三,zhangsan@qq.com,student,计算机1班" />
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="batchImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import { ElMessage } from 'element-plus'

const users = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const showAddDialog = ref(false)
const showImportDialog = ref(false)
const editingUser = ref<any>(null)
const importText = ref('')

const query = reactive({ page: 1, pageSize: 20, keyword: '', role: '', status: undefined as number | undefined })
const userForm = reactive({ username: '', real_name: '', email: '', phone: '', password: '', role: 'student', class_name: '' })

async function loadUsers() {
  loading.value = true
  try {
    const res: any = await api.get('/users', { params: query })
    if (res.code === 200) {
      users.value = res.data.list
      total.value = res.data.total
    }
  } finally { loading.value = false }
}

function editUser(user: any) {
  editingUser.value = user
  Object.assign(userForm, user)
  userForm.password = ''
  showAddDialog.value = true
}

async function saveUser() {
  if (editingUser.value) {
    const res: any = await api.put(`/users/${editingUser.value.id}`, userForm)
    if (res.code === 200) { ElMessage.success('更新成功'); showAddDialog.value = false; loadUsers() }
  } else {
    const res: any = await api.post('/users', userForm)
    if (res.code === 200) { ElMessage.success('创建成功'); showAddDialog.value = false; loadUsers() }
    else ElMessage.error(res.message)
  }
}

async function deleteUser(id: number) {
  const res: any = await api.delete(`/users/${id}`)
  if (res.code === 200) { ElMessage.success('删除成功'); loadUsers() }
}

async function toggleStatus(id: number, enabled: boolean) {
  const res: any = await api.put(`/users/${id}/status`, { status: enabled ? 1 : 0 })
  if (res.code === 200) ElMessage.success(res.message)
  loadUsers()
}

async function batchImport() {
  const lines = importText.value.trim().split('\n').filter(l => l.trim())
  const usersToImport = lines.map(line => {
    const parts = line.split(',')
    return { username: parts[0]?.trim(), real_name: parts[1]?.trim(), email: parts[2]?.trim(), role: parts[3]?.trim() || 'student', class_name: parts[4]?.trim() }
  })
  const res: any = await api.post('/users/batch-import', { users: usersToImport })
  if (res.code === 200) {
    ElMessage.success(`导入成功${res.data.imported}个用户`)
    if (res.data.errors?.length) ElMessage.warning(res.data.errors.join('\n'))
    showImportDialog.value = false
    importText.value = ''
    loadUsers()
  }
}

onMounted(loadUsers)
</script>
