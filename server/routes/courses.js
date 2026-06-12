const express = require('express');
const { getOne, getAll, run, lastId } = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// 课程列表
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 20, keyword, subject, status, teacher_id } = req.query;
  let where = [];
  let params = [];
  if (keyword) {
    where.push('(c.name LIKE ? OR c.description LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (subject) { where.push('c.subject=?'); params.push(subject); }
  if (status) { where.push('c.status=?'); params.push(status); }
  if (teacher_id) { where.push('c.teacher_id=?'); params.push(parseInt(teacher_id)); }
  // 学生只能看到已分配给自己的课程
  if (req.user.role === 'student') {
    where.push('ca.student_id=?');
    params.push(req.user.id);
  }
  // 教师只能看到自己的课程
  if (req.user.role === 'teacher') {
    where.push('c.teacher_id=?');
    params.push(req.user.id);
  }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const joinClause = req.user.role === 'student'
    ? 'LEFT JOIN course_assignments ca ON c.id=ca.course_id'
    : '';

  const countRow = getOne(`SELECT COUNT(*) as total FROM courses c ${joinClause} ${whereClause}`, params);
  const total = countRow ? countRow.total : 0;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const list = getAll(
    `SELECT c.*, u.real_name as teacher_name
     FROM courses c LEFT JOIN users u ON c.teacher_id=u.id ${joinClause}
     ${whereClause} ORDER BY c.id DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), offset]
  );

  res.json({ code: 200, data: { list, total, page: parseInt(page), page_size: parseInt(pageSize) } });
});

// 课程详情
router.get('/:id', authMiddleware, (req, res) => {
  const course = getOne(
    `SELECT c.*, u.real_name as teacher_name FROM courses c
     LEFT JOIN users u ON c.teacher_id=u.id WHERE c.id=?`,
    [req.params.id]
  );
  if (!course) return res.json({ code: 404, message: '课程不存在' });
  res.json({ code: 200, data: course });
});

// 创建课程
router.post('/', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  const { name, description, cover_url, subject, start_date, end_date } = req.body;
  if (!name) return res.json({ code: 400, message: '课程名称不能为空' });
  const status = req.user.role === 'admin' ? 'approved' : 'draft';
  run(
    `INSERT INTO courses (name, description, cover_url, subject, teacher_id, status, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description || null, cover_url || null, subject || null, req.user.id, status, start_date || null, end_date || null]
  );
  res.json({ code: 200, message: '创建成功', data: { id: lastId() } });
});

// 编辑课程
router.put('/:id', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  const { name, description, cover_url, subject, start_date, end_date } = req.body;
  run(
    `UPDATE courses SET name=COALESCE(?,name), description=COALESCE(?,description),
     cover_url=COALESCE(?,cover_url), subject=COALESCE(?,subject),
     start_date=COALESCE(?,start_date), end_date=COALESCE(?,end_date)
     WHERE id=?`,
    [name, description, cover_url, subject, start_date, end_date, req.params.id]
  );
  res.json({ code: 200, message: '更新成功' });
});

// 删除课程
router.delete('/:id', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  run('DELETE FROM courses WHERE id=?', [req.params.id]);
  res.json({ code: 200, message: '删除成功' });
});

// 提交审核
router.post('/:id/submit', authMiddleware, roleGuard('teacher'), (req, res) => {
  run('UPDATE courses SET status=? WHERE id=? AND teacher_id=?', ['pending', req.params.id, req.user.id]);
  res.json({ code: 200, message: '已提交审核' });
});

// 管理员审核课程
router.put('/:id/review', authMiddleware, roleGuard('admin'), (req, res) => {
  const { status, reason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.json({ code: 400, message: '无效的审核状态' });
  }
  run('UPDATE courses SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ code: 200, message: status === 'approved' ? '审核通过' : '已拒绝' });
});

// 分配课程给学生
router.post('/:id/assign', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  const { student_ids, class_name, deadline } = req.body;
  const courseId = req.params.id;
  let ids = [];
  if (Array.isArray(student_ids)) {
    ids = student_ids;
  } else if (class_name) {
    const students = getAll('SELECT id FROM users WHERE class_name=? AND role=?', [class_name, 'student']);
    ids = students.map(s => s.id);
  }
  let assigned = 0;
  for (const sid of ids) {
    try {
      run(
        'INSERT OR IGNORE INTO course_assignments (course_id, student_id, assigned_by, deadline) VALUES (?, ?, ?, ?)',
        [courseId, sid, req.user.id, deadline || null]
      );
      assigned++;
    } catch (e) { /* ignore duplicate */ }
  }
  res.json({ code: 200, message: `成功分配${assigned}名学生`, data: { assigned } });
});

// 取消分配
router.delete('/:id/assign/:studentId', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  run('DELETE FROM course_assignments WHERE course_id=? AND student_id=?',
    [req.params.id, req.params.studentId]);
  res.json({ code: 200, message: '取消分配成功' });
});

// 查看课程下的学生列表
router.get('/:id/students', authMiddleware, (req, res) => {
  const students = getAll(
    `SELECT u.id, u.username, u.real_name, u.class_name, u.email, ca.assigned_at, ca.deadline
     FROM course_assignments ca
     JOIN users u ON ca.student_id=u.id
     WHERE ca.course_id=? ORDER BY ca.assigned_at DESC`,
    [req.params.id]
  );
  res.json({ code: 200, data: students });
});

// 获取学科分类列表
router.get('/meta/subjects', authMiddleware, (req, res) => {
  const subjects = getAll("SELECT DISTINCT subject FROM courses WHERE subject IS NOT NULL AND subject != ''");
  res.json({ code: 200, data: subjects.map(s => s.subject) });
});

module.exports = router;
