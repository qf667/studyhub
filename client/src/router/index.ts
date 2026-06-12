import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { role: 'admin' },
    children: [
      { path: '', name: 'AdminDashboard', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'users', name: 'AdminUsers', component: () => import('../views/admin/Users.vue') },
      { path: 'courses', name: 'AdminCourses', component: () => import('../views/admin/Courses.vue') },
      { path: 'settings', name: 'AdminSettings', component: () => import('../views/admin/Settings.vue') }
    ]
  },
  {
    path: '/teacher',
    component: () => import('../layouts/TeacherLayout.vue'),
    meta: { role: 'teacher' },
    children: [
      { path: '', name: 'TeacherCourses', component: () => import('../views/teacher/Courses.vue') },
      { path: 'course/:id', name: 'TeacherCourseDetail', component: () => import('../views/teacher/CourseDetail.vue') },
      { path: 'ai-questions', name: 'TeacherAIQuestions', component: () => import('../views/teacher/AIQuestions.vue') },
      { path: 'homework/:id/grade', name: 'TeacherGrade', component: () => import('../views/teacher/Grade.vue') }
    ]
  },
  {
    path: '/student',
    component: () => import('../layouts/StudentLayout.vue'),
    meta: { role: 'student' },
    children: [
      { path: '', name: 'StudentHome', component: () => import('../views/student/Home.vue') },
      { path: 'courses', name: 'StudentCourses', component: () => import('../views/student/Courses.vue') },
      { path: 'course/:id', name: 'StudentCourseDetail', component: () => import('../views/student/CourseDetail.vue') },
      { path: 'homework/:id', name: 'StudentHomework', component: () => import('../views/student/Homework.vue') },
      { path: 'wrong-questions', name: 'StudentWrongQuestions', component: () => import('../views/student/WrongQuestions.vue') },
      { path: 'report', name: 'StudentReport', component: () => import('../views/student/Report.vue') },
      { path: 'chat', name: 'StudentChat', component: () => import('../views/student/Chat.vue') }
    ]
  },
  { path: '/', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.path === '/login') {
    if (auth.isLoggedIn) {
      const role = auth.userRole
      next(`/${role}`)
    } else {
      next()
    }
    return
  }
  if (!auth.isLoggedIn) {
    next('/login')
    return
  }
  const role = auth.userRole
  if (to.meta.role && to.meta.role !== role) {
    next(`/${role}`)
    return
  }
  next()
})

export default router
