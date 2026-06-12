const express = require('express');
const bcrypt = require('bcryptjs');
const { getOne, getAll, run, lastId } = require('../db');
const { authMiddleware, roleGuard, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// 用户列表（管理员）
router.get('/', authMiddleware, roleGuard('admin'), asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20, keyword, role, status, class_name } = req.query;
  let where = [];
  let params = [];
  if (keyword) {
    where.push('(username LIKE ? OR real_name LIKE ? OR email LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (role) { where.push('role=?'); params.push(role); }
  if (status !== undefined && status !== '') { where.push('status=?'); params.push(parseInt(status)); }
  if (class_name) { where.push('class_name=?'); params.push(class_name); }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const countRow = await getOne(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
  const total = countRow ? countRow.total : 0;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const list = await getAll(
    `SELECT id, username, email, phone, real_name, avatar_url, role, class_name, status, created_at
     FROM users ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), offset]
  );

  res.json({ code: 200, data: { list, total, page: parseInt(page), page_size: parseInt(pageSize) } });
}));

// 创建用户（管理员）
router.post('/', authMiddleware, roleGuard('admin'), asyncHandler(async (req, res) => {
  const { username, email, phone, password, real_name, role = 'student', class_name } = req.body;
  if (!username || !password) return res.json({ code: 400, message: '用户名和密码不能为空' });
  const existing = await getOne('SELECT id FROM users WHERE username=?', [username]);
  if (existing) return res.json({ code: 400, message: '用户名已存在' });
  const hash = bcrypt.hashSync(password, 10);
  await run(
    `INSERT INTO users (username, email, phone, password_hash, real_name, role, class_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [username, email || null, phone || null, hash, real_name || username, role, class_name || null]
  );
  res.json({ code: 200, message: '创建成功', data: { id: await lastId() } });
}));

// 更新用户
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { real_name, email, phone, avatar_url, class_name } = req.body;
  await run(
    `UPDATE users SET real_name=COALESCE(?,real_name), email=COALESCE(?,email),
     phone=COALESCE(?,phone), avatar_url=COALESCE(?,avatar_url),
     class_name=COALESCE(?,class_name), updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [real_name, email, phone, avatar_url, class_name, id]
  );
  res.json({ code: 200, message: '更新成功' });
}));

// 删除用户（管理员）
router.delete('/:id', authMiddleware, roleGuard('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  await run('DELETE FROM users WHERE id=?', [id]);
  res.json({ code: 200, message: '删除成功' });
}));

// 分配角色（管理员）
router.put('/:id/role', authMiddleware, roleGuard('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['admin', 'teacher', 'student'].includes(role)) {
    return res.json({ code: 400, message: '无效的角色' });
  }
  await run('UPDATE users SET role=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [role, id]);
  res.json({ code: 200, message: '角色分配成功' });
}));

// 启用/禁用（管理员）
router.put('/:id/status', authMiddleware, roleGuard('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await run('UPDATE users SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [status ? 1 : 0, id]);
  res.json({ code: 200, message: status ? '已启用' : '已禁用' });
}));

// 批量导入（简化版）
router.post('/batch-import', authMiddleware, roleGuard('admin'), asyncHandler(async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users) || users.length === 0) {
    return res.json({ code: 400, message: '用户列表不能为空' });
  }
  let imported = 0;
  let errors = [];
  for (const u of users) {
    try {
      const existing = await getOne('SELECT id FROM users WHERE username=?', [u.username]);
      if (existing) { errors.push(`${u.username}: 已存在`); continue; }
      const hash = bcrypt.hashSync(u.password || '123456', 10);
      await run(
        `INSERT INTO users (username, email, phone, password_hash, real_name, role, class_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.username, u.email || null, u.phone || null, hash, u.real_name || u.username, u.role || 'student', u.class_name || null]
      );
      imported++;
    } catch (e) {
      errors.push(`${u.username}: ${e.message}`);
    }
  }
  res.json({ code: 200, data: { imported, errors } });
}));

// 获取班级列表
router.get('/classes', authMiddleware, asyncHandler(async (req, res) => {
  const classes = await getAll("SELECT DISTINCT class_name FROM users WHERE class_name IS NOT NULL AND class_name != ''");
  res.json({ code: 200, data: classes.map(c => c.class_name) });
}));

module.exports = router;
