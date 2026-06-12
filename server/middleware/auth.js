const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'studyhub_secret_key_change_in_production';
const JWT_EXPIRES = '2h';
const REFRESH_EXPIRES = '7d';

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
  return { accessToken, refreshToken };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或Token已过期' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'Token无效或已过期' });
  }
}

function roleGuard(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }
    next();
  };
}

// Async route wrapper - catches errors and passes to error handler
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { JWT_SECRET, generateTokens, authMiddleware, roleGuard, asyncHandler };
