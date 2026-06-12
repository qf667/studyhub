const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
});
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
});

app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1', apiLimiter);

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/courses', require('./routes/courses'));
app.use('/api/v1/materials', require('./routes/materials'));
app.use('/api/v1/questions', require('./routes/questions'));
app.use('/api/v1/homework', require('./routes/homework'));
app.use('/api/v1/practice', require('./routes/practice'));
app.use('/api/v1/ai', require('./routes/ai'));
app.use('/api/v1/stats', require('./routes/stats'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend (production build)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

async function start() {
  await getDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyHub server running on http://0.0.0.0:${PORT}`);
  });
}

start();
