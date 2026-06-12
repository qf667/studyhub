const express = require('express');
const { getOne, getAll, run } = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// 管理员看板
router.get('/admin', authMiddleware, roleGuard('admin'), (req, res) => {
  const totalUsers = getOne('SELECT COUNT(*) as count FROM users')?.count || 0;
  const totalStudents = getOne("SELECT COUNT(*) as count FROM users WHERE role='student'")?.count || 0;
  const totalTeachers = getOne("SELECT COUNT(*) as count FROM users WHERE role='teacher'")?.count || 0;
  const totalCourses = getOne('SELECT COUNT(*) as count FROM courses')?.count || 0;
  const approvedCourses = getOne("SELECT COUNT(*) as count FROM courses WHERE status='approved'")?.count || 0;
  const pendingCourses = getOne("SELECT COUNT(*) as count FROM courses WHERE status='pending'")?.count || 0;
  const totalHomework = getOne('SELECT COUNT(*) as count FROM homework')?.count || 0;
  const totalSubmissions = getOne('SELECT COUNT(*) as count FROM submissions')?.count || 0;
  const gradedSubmissions = getOne("SELECT COUNT(*) as count FROM submissions WHERE status='graded'")?.count || 0;
  const avgScore = getOne('SELECT AVG(score) as avg FROM submissions WHERE score IS NOT NULL')?.avg || 0;

  // 最近7天注册趋势
  const registrationTrend = getAll(
    `SELECT DATE(created_at) as date, COUNT(*) as count FROM users
     WHERE created_at >= datetime('now', '-7 days')
     GROUP BY DATE(created_at) ORDER BY date`
  );

  // 学科分布
  const subjectDistribution = getAll(
    "SELECT subject, COUNT(*) as count FROM courses WHERE subject IS NOT NULL GROUP BY subject"
  );

  res.json({
    code: 200,
    data: {
      totalUsers, totalStudents, totalTeachers, totalCourses, approvedCourses, pendingCourses,
      totalHomework, totalSubmissions, gradedSubmissions, avgScore: avgScore.toFixed(1),
      registrationTrend, subjectDistribution
    }
  });
});

// 教师看板
router.get('/teacher', authMiddleware, roleGuard('teacher'), (req, res) => {
  const myCourses = getOne('SELECT COUNT(*) as count FROM courses WHERE teacher_id=?', [req.user.id])?.count || 0;
  const myApprovedCourses = getOne("SELECT COUNT(*) as count FROM courses WHERE teacher_id=? AND status='approved'", [req.user.id])?.count || 0;
  const myHomework = getOne('SELECT COUNT(*) as count FROM homework WHERE created_by=?', [req.user.id])?.count || 0;
  const myQuestions = getOne('SELECT COUNT(*) as count FROM questions WHERE created_by=?', [req.user.id])?.count || 0;

  // 我的课程的学生数
  const totalStudents = getOne(
    `SELECT COUNT(DISTINCT ca.student_id) as count FROM course_assignments ca
     JOIN courses c ON ca.course_id=c.id WHERE c.teacher_id=?`,
    [req.user.id]
  )?.count || 0;

  // 作业完成情况
  const homeworkStats = getAll(
    `SELECT h.title, h.total_score,
     (SELECT COUNT(*) FROM submissions s WHERE s.homework_id=h.id) as submitted_count,
     (SELECT COUNT(DISTINCT ca.student_id) FROM course_assignments ca WHERE ca.course_id=h.course_id) as total_students,
     (SELECT AVG(s.score) FROM submissions s WHERE s.homework_id=h.id AND s.score IS NOT NULL) as avg_score
     FROM homework h WHERE h.created_by=? AND h.status='published'`,
    [req.user.id]
  );

  // 成绩分布
  const scoreDistribution = getAll(
    `SELECT
       CASE
         WHEN s.score >= 90 THEN '优秀(90-100)'
         WHEN s.score >= 80 THEN '良好(80-89)'
         WHEN s.score >= 70 THEN '中等(70-79)'
         WHEN s.score >= 60 THEN '及格(60-69)'
         ELSE '不及格(<60)'
       END as range,
       COUNT(*) as count
     FROM submissions s
     JOIN homework h ON s.homework_id=h.id
     WHERE h.created_by=? AND s.score IS NOT NULL
     GROUP BY range`,
    [req.user.id]
  );

  // 知识点薄弱分析
  const weakPoints = getAll(
    `SELECT q.knowledge_point, COUNT(*) as wrong_count
     FROM wrong_questions wq
     JOIN questions q ON wq.question_id=q.id
     WHERE q.created_by=? AND q.knowledge_point IS NOT NULL
     GROUP BY q.knowledge_point ORDER BY wrong_count DESC LIMIT 10`,
    [req.user.id]
  );

  res.json({
    code: 200,
    data: {
      myCourses, myApprovedCourses, myHomework, myQuestions, totalStudents,
      homeworkStats, scoreDistribution, weakPoints
    }
  });
});

// 学生看板
router.get('/student', authMiddleware, roleGuard('student'), (req, res) => {
  const myCourses = getOne(
    'SELECT COUNT(*) as count FROM course_assignments WHERE student_id=?',
    [req.user.id]
  )?.count || 0;

  const totalSubmissions = getOne(
    'SELECT COUNT(*) as count FROM submissions WHERE student_id=?',
    [req.user.id]
  )?.count || 0;

  const avgScore = getOne(
    "SELECT AVG(score) as avg FROM submissions WHERE student_id=? AND status IN ('submitted','graded')",
    [req.user.id]
  )?.avg || 0;

  const wrongCount = getOne(
    'SELECT COUNT(*) as count FROM wrong_questions WHERE student_id=? AND is_mastered=0',
    [req.user.id]
  )?.count || 0;

  const masteredCount = getOne(
    'SELECT COUNT(*) as count FROM wrong_questions WHERE student_id=? AND is_mastered=1',
    [req.user.id]
  )?.count || 0;

  // 课程进度
  const courseProgress = getAll(
    `SELECT c.id, c.name, c.subject,
     (SELECT COUNT(*) FROM homework h WHERE h.course_id=c.id AND h.status='published') as total_homework,
     (SELECT COUNT(*) FROM submissions s JOIN homework h ON s.homework_id=h.id WHERE h.course_id=c.id AND s.student_id=?) as completed_homework
     FROM courses c
     JOIN course_assignments ca ON c.id=ca.course_id
     WHERE ca.student_id=?`,
    [req.user.id, req.user.id]
  );

  // 成绩趋势
  const scoreTrend = getAll(
    `SELECT DATE(s.submitted_at) as date, AVG(s.score) as avg_score
     FROM submissions s WHERE s.student_id=? AND s.score IS NOT NULL
     GROUP BY DATE(s.submitted_at) ORDER BY date LIMIT 20`,
    [req.user.id]
  );

  // 知识点掌握情况（雷达图数据）
  const knowledgePoints = getAll(
    `SELECT q.knowledge_point,
     COUNT(*) as total,
     SUM(CASE WHEN wq.id IS NOT NULL AND wq.is_mastered=0 THEN 1 ELSE 0 END) as wrong_count
     FROM submissions s
     JOIN homework h ON s.homework_id=h.id
     JOIN homework_questions hq ON hq.homework_id=h.id
     JOIN questions q ON hq.question_id=q.id
     LEFT JOIN wrong_questions wq ON wq.question_id=q.id AND wq.student_id=?
     WHERE s.student_id=? AND q.knowledge_point IS NOT NULL
     GROUP BY q.knowledge_point LIMIT 8`,
    [req.user.id, req.user.id]
  );

  // 待完成作业
  const pendingHomework = getAll(
    `SELECT h.id, h.title, h.deadline, h.total_score, c.name as course_name
     FROM homework h
     JOIN courses c ON h.course_id=c.id
     JOIN course_assignments ca ON h.course_id=ca.course_id
     WHERE ca.student_id=? AND h.status='published'
     AND h.id NOT IN (SELECT homework_id FROM submissions WHERE student_id=?)
     ORDER BY h.deadline LIMIT 5`,
    [req.user.id, req.user.id]
  );

  res.json({
    code: 200,
    data: {
      myCourses, totalSubmissions, avgScore: avgScore.toFixed(1),
      wrongCount, masteredCount, courseProgress, scoreTrend,
      knowledgePoints, pendingHomework
    }
  });
});

module.exports = router;
