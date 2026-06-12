const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne, run, lastId } = require('../db');
const { JWT_SECRET, generateTokens, authMiddleware, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// 注册 - only students can self-register, teachers/admins must be created by admin
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, phone, password, real_name, class_name } = req.body;
  if (!username || !password) {
    return res.json({ code: 400, message: '用户名和密码不能为空' });
  }
  if (username.length < 3 || username.length > 30) {
    return res.json({ code: 400, message: '用户名长度需在3-30个字符之间' });
  }
  if (password.length < 6) {
    return res.json({ code: 400, message: '密码长度至少6个字符' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ code: 400, message: '邮箱格式不正确' });
  }
  const existing = getOne('SELECT id FROM users WHERE username=?', [username]);
  if (existing) {
    return res.json({ code: 400, message: '用户名已存在' });
  }
  if (email) {
    const existEmail = getOne('SELECT id FROM users WHERE email=?', [email]);
    if (existEmail) return res.json({ code: 400, message: '邮箱已被使用' });
  }
  const hash = bcrypt.hashSync(password, 10);
  run(
    `INSERT INTO users (username, email, phone, password_hash, real_name, role, class_name)
     VALUES (?, ?, ?, ?, ?, 'student', ?)`,
    [username.trim(), email || null, phone || null, hash, real_name || username, class_name || null]
  );
  const id = lastId();
  res.json({ code: 200, message: '注册成功', data: { id } });
}));

// 登录
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ code: 400, message: '用户名和密码不能为空' });
  }
  const user = getOne('SELECT * FROM users WHERE username=?', [username.trim()]);
  if (!user) {
    return res.json({ code: 40001, message: '用户名或密码错误' });
  }
  if (user.status === 0) {
    return res.json({ code: 403, message: '账户已被禁用' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.json({ code: 40001, message: '用户名或密码错误' });
  }
  const tokens = generateTokens(user);
  res.json({
    code: 200,
    message: '登录成功',
    data: {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        real_name: user.real_name,
        role: user.role,
        email: user.email,
        avatar_url: user.avatar_url,
        class_name: user.class_name
      }
    }
  });
}));

// 刷新Token
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.json({ code: 400, message: 'refreshToken不能为空' });
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.json({ code: 401, message: 'Token类型错误' });
    }
    const user = getOne('SELECT * FROM users WHERE id=?', [decoded.id]);
    if (!user || user.status === 0) {
      return res.json({ code: 401, message: '用户不存在或已禁用' });
    }
    const tokens = generateTokens(user);
    res.json({ code: 200, data: tokens });
  } catch (err) {
    res.json({ code: 401, message: 'Token无效或已过期' });
  }
}));

// 获取当前用户信息
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = getOne(
    'SELECT id, username, email, phone, real_name, avatar_url, role, class_name, status, created_at FROM users WHERE id=?',
    [req.user.id]
  );
  if (!user) return res.json({ code: 404, message: '用户不存在' });
  res.json({ code: 200, data: user });
}));

// 修改密码
router.put('/password', authMiddleware, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.json({ code: 400, message: '新密码长度至少6个字符' });
  }
  const user = getOne('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.json({ code: 400, message: '原密码错误' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  run('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [hash, req.user.id]);
  res.json({ code: 200, message: '密码修改成功' });
}));

module.exports = router;
