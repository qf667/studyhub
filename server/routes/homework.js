const express = require('express');
const { getOne, getAll, run, lastId } = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// 创建作业
router.post('/', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  const { course_id, title, description, deadline, time_limit, allow_retry, question_ids } = req.body;
  if (!course_id || !title || !deadline) return res.json({ code: 400, message: '课程、标题和截止时间不能为空' });

  let totalScore = 0;
  run(
    `INSERT INTO homework (course_id, title, description, deadline, time_limit, allow_retry, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [course_id, title, description || null, deadline, time_limit || null, allow_retry ? 1 : 0, req.user.id]
  );
  const homeworkId = lastId();

  if (Array.isArray(question_ids)) {
    for (let i = 0; i < question_ids.length; i++) {
      const q = getOne('SELECT score FROM questions WHERE id=?', [question_ids[i]]);
      const score = q ? q.score : 1;
      totalScore += score;
      run(
        'INSERT INTO homework_questions (homework_id, question_id, score, sort_order) VALUES (?, ?, ?, ?)',
        [homeworkId, question_ids[i], score, i + 1]
      );
    }
    run('UPDATE homework SET total_score=? WHERE id=?', [totalScore, homeworkId]);
  }

  res.json({ code: 200, message: '创建成功', data: { id: homeworkId } });
});

// 作业列表
router.get('/', authMiddleware, (req, res) => {
  const { course_id, status } = req.query;
  let where = [];
  let params = [];
  if (course_id) { where.push('h.course_id=?'); params.push(parseInt(course_id)); }
  if (status) { where.push('h.status=?'); params.push(status); }
  if (req.user.role === 'student') {
    where.push('h.status=?');
    params.push('published');
    where.push('ca.student_id=?');
    params.push(req.user.id);
  }
  if (req.user.role === 'teacher') {
    where.push('h.created_by=?');
    params.push(req.user.id);
  }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const joinClause = req.user.role === 'student'
    ? 'LEFT JOIN course_assignments ca ON h.course_id=ca.course_id'
    : '';

  const list = getAll(
    `SELECT h.*, c.name as course_name, u.real_name as creator_name
     FROM homework h
     LEFT JOIN courses c ON h.course_id=c.id
     LEFT JOIN users u ON h.created_by=u.id
     ${joinClause}
     ${whereClause} ORDER BY h.id DESC`,
    params
  );
  res.json({ code: 200, data: list });
});

// 作业详情
router.get('/:id', authMiddleware, (req, res) => {
  const homework = getOne(
    `SELECT h.*, c.name as course_name FROM homework h
     LEFT JOIN courses c ON h.course_id=c.id WHERE h.id=?`,
    [req.params.id]
  );
  if (!homework) return res.json({ code: 404, message: '作业不存在' });

  const questions = getAll(
    `SELECT q.*, hq.score as hw_score, hq.sort_order
     FROM homework_questions hq
     JOIN questions q ON hq.question_id=q.id
     WHERE hq.homework_id=? ORDER BY hq.sort_order`,
    [req.params.id]
  );
  for (const q of questions) {
    if (q.options && typeof q.options === 'string') {
      try { q.options = JSON.parse(q.options); } catch (e) {}
    }
  }
  homework.questions = questions;
  res.json({ code: 200, data: homework });
});

// 编辑作业
router.put('/:id', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  const { title, description, deadline, time_limit, allow_retry } = req.body;
  run(
    `UPDATE homework SET title=COALESCE(?,title), description=COALESCE(?,description),
     deadline=COALESCE(?,deadline), time_limit=COALESCE(?,time_limit),
     allow_retry=COALESCE(?,allow_retry) WHERE id=?`,
    [title, description, deadline, time_limit, allow_retry, req.params.id]
  );
  res.json({ code: 200, message: '更新成功' });
});

// 发布作业
router.post('/:id/publish', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  run('UPDATE homework SET status=? WHERE id=?', ['published', req.params.id]);
  res.json({ code: 200, message: '发布成功' });
});

// 删除作业
router.delete('/:id', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  run('DELETE FROM homework_questions WHERE homework_id=?', [req.params.id]);
  run('DELETE FROM homework WHERE id=?', [req.params.id]);
  res.json({ code: 200, message: '删除成功' });
});

// 学生提交作业
router.post('/:id/submit', authMiddleware, roleGuard('student'), (req, res) => {
  const { answers } = req.body;
  const homeworkId = req.params.id;
  if (!answers) return res.json({ code: 400, message: '答案不能为空' });

  const homework = getOne('SELECT * FROM homework WHERE id=?', [homeworkId]);
  if (!homework) return res.json({ code: 404, message: '作业不存在' });

  // 检查是否已提交
  const existing = getOne(
    'SELECT id FROM submissions WHERE homework_id=? AND student_id=? AND status IN (?, ?)',
    [homeworkId, req.user.id, 'submitted', 'graded']
  );
  if (existing && !homework.allow_retry) {
    return res.json({ code: 400, message: '已经提交过该作业' });
  }

  // 自动批改客观题
  const hwQuestions = getAll(
    'SELECT hq.question_id, hq.score, q.type, q.answer FROM homework_questions hq JOIN questions q ON hq.question_id=q.id WHERE hq.homework_id=?',
    [homeworkId]
  );

  let totalScore = 0;
  let maxScore = 0;
  const wrongQuestions = [];

  for (const hq of hwQuestions) {
    maxScore += hq.score;
    const userAnswer = answers[hq.question_id] || '';
    const correctAnswer = hq.answer;

    if (['single_choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(hq.type)) {
      const isCorrect = userAnswer.toString().trim().toLowerCase() === correctAnswer.toString().trim().toLowerCase();
      if (isCorrect) {
        totalScore += hq.score;
      } else {
        wrongQuestions.push({ question_id: hq.question_id, wrong_answer: userAnswer });
      }
    } else {
      // 简答题给一半分，待教师批改
      totalScore += hq.score * 0.5;
    }
  }

  if (existing && homework.allow_retry) {
    run(
      `UPDATE submissions SET answers=?, score=?, status='submitted', submitted_at=CURRENT_TIMESTAMP WHERE id=?`,
      [JSON.stringify(answers), totalScore, existing.id]
    );
  } else {
    run(
      `INSERT INTO submissions (homework_id, student_id, answers, score, status, started_at, submitted_at)
       VALUES (?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [homeworkId, req.user.id, JSON.stringify(answers), totalScore]
    );
  }

  // 记录错题
  for (const wq of wrongQuestions) {
    const exists = getOne(
      'SELECT id FROM wrong_questions WHERE student_id=? AND question_id=?',
      [req.user.id, wq.question_id]
    );
    if (!exists) {
      run(
        'INSERT INTO wrong_questions (student_id, question_id, wrong_answer) VALUES (?, ?, ?)',
        [req.user.id, wq.question_id, wq.wrong_answer]
      );
    }
  }

  res.json({
    code: 200,
    message: '提交成功',
    data: { score: totalScore, maxScore, status: 'submitted' }
  });
});

// 查看某作业的提交情况（教师端）
router.get('/:id/submissions', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  const submissions = getAll(
    `SELECT s.*, u.real_name as student_name, u.class_name
     FROM submissions s JOIN users u ON s.student_id=u.id
     WHERE s.homework_id=? ORDER BY s.submitted_at DESC`,
    [req.params.id]
  );
  for (const s of submissions) {
    if (s.answers && typeof s.answers === 'string') {
      try { s.answers = JSON.parse(s.answers); } catch (e) {}
    }
  }
  res.json({ code: 200, data: submissions });
});

// 教师批改
router.put('/submissions/:id/grade', authMiddleware, roleGuard('admin', 'teacher'), (req, res) => {
  const { score } = req.body;
  run(
    `UPDATE submissions SET score=?, status='graded', graded_at=CURRENT_TIMESTAMP, graded_by=? WHERE id=?`,
    [score, req.user.id, req.params.id]
  );
  res.json({ code: 200, message: '批改完成' });
});

// 我的提交记录（学生端）
router.get('/submissions/mine', authMiddleware, roleGuard('student'), (req, res) => {
  const submissions = getAll(
    `SELECT s.*, h.title as homework_title, h.total_score, c.name as course_name
     FROM submissions s
     JOIN homework h ON s.homework_id=h.id
     JOIN courses c ON h.course_id=c.id
     WHERE s.student_id=? ORDER BY s.submitted_at DESC`,
    [req.user.id]
  );
  for (const s of submissions) {
    if (s.answers && typeof s.answers === 'string') {
      try { s.answers = JSON.parse(s.answers); } catch (e) {}
    }
  }
  res.json({ code: 200, data: submissions });
});

module.exports = router;
