const express = require('express');
const { getOne, getAll, run, lastId } = require('../db');
const { authMiddleware, roleGuard, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// 习题列表
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 50, course_id, material_id, chapter_id, type, difficulty } = req.query;
  let where = [];
  let params = [];
  if (course_id) { where.push('q.course_id=?'); params.push(parseInt(course_id)); }
  if (material_id) { where.push('q.material_id=?'); params.push(parseInt(material_id)); }
  if (chapter_id) { where.push('q.chapter_id=?'); params.push(parseInt(chapter_id)); }
  if (type) { where.push('q.type=?'); params.push(type); }
  if (difficulty) { where.push('q.difficulty=?'); params.push(difficulty); }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const countRow = await getOne(`SELECT COUNT(*) as total FROM questions q ${whereClause}`, params);
  const total = countRow ? countRow.total : 0;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const list = await getAll(
    `SELECT q.*, u.real_name as creator_name
     FROM questions q LEFT JOIN users u ON q.created_by=u.id
     ${whereClause} ORDER BY q.id DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), offset]
  );

  for (const item of list) {
    if (item.options && typeof item.options === 'string') {
      try { item.options = JSON.parse(item.options); } catch (e) {}
    }
  }

  res.json({ code: 200, data: { list, total, page: parseInt(page), page_size: parseInt(pageSize) } });
}));

// 创建习题
router.post('/', authMiddleware, roleGuard('admin', 'teacher'), asyncHandler(async (req, res) => {
  const { course_id, material_id, chapter_id, type, difficulty, content, options, answer, explanation, knowledge_point, score, source } = req.body;
  if (!content || !answer || !type) return res.json({ code: 400, message: '题目内容、类型和答案不能为空' });
  await run(
    `INSERT INTO questions (course_id, material_id, chapter_id, type, difficulty, content, options, answer, explanation, knowledge_point, score, source, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [course_id || null, material_id || null, chapter_id || null, type, difficulty || 'medium',
     content, options ? JSON.stringify(options) : null, answer, explanation || null,
     knowledge_point || null, score || 1, source || 'manual', req.user.id]
  );
  res.json({ code: 200, message: '创建成功', data: { id: await lastId() } });
}));

// 编辑习题
router.put('/:id', authMiddleware, roleGuard('admin', 'teacher'), asyncHandler(async (req, res) => {
  const { type, difficulty, content, options, answer, explanation, knowledge_point, score } = req.body;
  await run(
    `UPDATE questions SET type=COALESCE(?,type), difficulty=COALESCE(?,difficulty),
     content=COALESCE(?,content), options=COALESCE(?,options), answer=COALESCE(?,answer),
     explanation=COALESCE(?,explanation), knowledge_point=COALESCE(?,knowledge_point),
     score=COALESCE(?,score) WHERE id=?`,
    [type, difficulty, content, options ? JSON.stringify(options) : null,
     answer, explanation, knowledge_point, score, req.params.id]
  );
  res.json({ code: 200, message: '更新成功' });
}));

// 删除习题
router.delete('/:id', authMiddleware, roleGuard('admin', 'teacher'), asyncHandler(async (req, res) => {
  await run('DELETE FROM questions WHERE id=?', [req.params.id]);
  res.json({ code: 200, message: '删除成功' });
}));

// 批量操作
router.post('/batch', authMiddleware, roleGuard('admin', 'teacher'), asyncHandler(async (req, res) => {
  const { action, ids, data } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({ code: 400, message: '请选择题目' });
  const placeholders = ids.map(() => '?').join(',');
  if (action === 'delete') {
    await run(`DELETE FROM questions WHERE id IN (${placeholders})`, ids);
  } else if (action === 'update_difficulty' && data?.difficulty) {
    await run(`UPDATE questions SET difficulty=? WHERE id IN (${placeholders})`, [data.difficulty, ...ids]);
  } else if (action === 'update_score' && data?.score) {
    await run(`UPDATE questions SET score=? WHERE id IN (${placeholders})`, [data.score, ...ids]);
  }
  res.json({ code: 200, message: '操作成功' });
}));

module.exports = router;
