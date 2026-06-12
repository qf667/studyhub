const express = require('express');
const { getOne, getAll, run } = require('../db');
const { authMiddleware, roleGuard, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// 错题本
router.get('/wrong-questions', authMiddleware, roleGuard('student'), asyncHandler(async (req, res) => {
  const { course_id, is_mastered } = req.query;
  let where = ['wq.student_id=?'];
  let params = [req.user.id];
  if (is_mastered !== undefined) { where.push('wq.is_mastered=?'); params.push(parseInt(is_mastered)); }
  if (course_id) { where.push('q.course_id=?'); params.push(parseInt(course_id)); }

  const list = await getAll(
    `SELECT wq.*, q.content, q.type, q.options, q.answer, q.explanation, q.knowledge_point,
     c.name as course_name
     FROM wrong_questions wq
     JOIN questions q ON wq.question_id=q.id
     LEFT JOIN courses c ON q.course_id=c.id
     WHERE ${where.join(' AND ')} ORDER BY wq.created_at DESC`,
    params
  );
  for (const item of list) {
    if (item.options && typeof item.options === 'string') {
      try { item.options = JSON.parse(item.options); } catch (e) {}
    }
  }
  res.json({ code: 200, data: list });
}));

// 标记已掌握
router.put('/wrong-questions/:id/master', authMiddleware, roleGuard('student'), asyncHandler(async (req, res) => {
  await run('UPDATE wrong_questions SET is_mastered=1 WHERE id=? AND student_id=?', [req.params.id, req.user.id]);
  res.json({ code: 200, message: '已标记为掌握' });
}));

// 按知识点练习
router.post('/start', authMiddleware, roleGuard('student'), asyncHandler(async (req, res) => {
  const { course_id, knowledge_point, difficulty, count = 10 } = req.body;
  let where = ['course_id=?'];
  let params = [course_id];
  if (knowledge_point) { where.push('knowledge_point LIKE ?'); params.push(`%${knowledge_point}%`); }
  if (difficulty) { where.push('difficulty=?'); params.push(difficulty); }

  const questions = await getAll(
    `SELECT * FROM questions WHERE ${where.join(' AND ')} ORDER BY RANDOM() LIMIT ?`,
    [...params, parseInt(count)]
  );
  for (const q of questions) {
    if (q.options && typeof q.options === 'string') {
      try { q.options = JSON.parse(q.options); } catch (e) {}
    }
    delete q.answer;
    delete q.explanation;
  }
  res.json({ code: 200, data: questions });
}));

// 提交练习答案
router.post('/submit', authMiddleware, roleGuard('student'), asyncHandler(async (req, res) => {
  const { answers, course_id } = req.body;
  if (!answers || !Array.isArray(answers)) return res.json({ code: 400, message: '答案格式错误' });

  let totalCorrect = 0;
  let totalQuestions = answers.length;
  const results = [];

  for (const a of answers) {
    const question = await getOne('SELECT * FROM questions WHERE id=?', [a.question_id]);
    if (!question) continue;
    const isCorrect = a.user_answer?.toString().trim().toLowerCase() === question.answer?.toString().trim().toLowerCase();
    if (isCorrect) totalCorrect++;
    else {
      const exists = await getOne('SELECT id FROM wrong_questions WHERE student_id=? AND question_id=?', [req.user.id, a.question_id]);
      if (!exists) {
        await run('INSERT INTO wrong_questions (student_id, question_id, wrong_answer) VALUES (?, ?, ?)',
          [req.user.id, a.question_id, a.user_answer]);
      }
    }
    results.push({
      question_id: a.question_id,
      user_answer: a.user_answer,
      correct_answer: question.answer,
      is_correct: isCorrect,
      explanation: question.explanation
    });
  }

  res.json({
    code: 200,
    data: { total: totalQuestions, correct: totalCorrect, accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions * 100).toFixed(1) : 0, results }
  });
}));

module.exports = router;
