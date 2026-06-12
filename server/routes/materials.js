const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getOne, getAll, run, lastId } = require('../db');
const { authMiddleware, roleGuard, asyncHandler } = require('../middleware/auth');
const { parseDocument } = require('../services/docParser');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('不支持的文件格式'));
  }
});

// 上传教材 - real document parsing
router.post('/upload', authMiddleware, roleGuard('admin', 'teacher'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.json({ code: 400, message: '请选择文件' });
  const { course_id, title } = req.body;
  if (!course_id) return res.json({ code: 400, message: '请选择课程' });

  const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();
  const typeMap = { doc: 'docx', docx: 'docx', pdf: 'pdf', txt: 'txt', ppt: 'pptx', pptx: 'pptx' };
  const fileType = typeMap[ext] || ext;

  // Parse document content
  const { text, chapters } = await parseDocument(req.file.path, fileType);
  const extractedText = text || `[${req.file.originalname}] 文档解析未提取到文本内容`;

  run(
    `INSERT INTO materials (course_id, title, file_url, file_type, file_size, extracted_text, upload_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [course_id, title || req.file.originalname, `/uploads/${req.file.filename}`, fileType, req.file.size, extractedText, req.user.id]
  );
  const materialId = lastId();

  // Save parsed chapters
  if (chapters.length > 0) {
    for (const ch of chapters) {
      run(
        'INSERT INTO chapters (material_id, title, content, sort_order) VALUES (?, ?, ?, ?)',
        [materialId, ch.title, ch.content, ch.sort_order]
      );
    }
  }

  res.json({
    code: 200,
    message: '上传成功',
    data: { id: materialId, chapters_count: chapters.length, text_length: extractedText.length }
  });
}));

// 教材列表
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { course_id } = req.query;
  let where = '';
  let params = [];
  if (course_id) { where = 'WHERE m.course_id=?'; params.push(parseInt(course_id)); }
  const list = getAll(
    `SELECT m.*, u.real_name as uploader_name
     FROM materials m LEFT JOIN users u ON m.upload_by=u.id
     ${where} ORDER BY m.id DESC`,
    params
  );
  res.json({ code: 200, data: list });
}));

// 教材详情
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const material = getOne('SELECT * FROM materials WHERE id=?', [req.params.id]);
  if (!material) return res.json({ code: 404, message: '教材不存在' });
  res.json({ code: 200, data: material });
}));

// 获取教材章节
router.get('/:id/chapters', authMiddleware, asyncHandler(async (req, res) => {
  const chapters = getAll(
    'SELECT * FROM chapters WHERE material_id=? ORDER BY sort_order',
    [req.params.id]
  );
  res.json({ code: 200, data: chapters });
}));

// 删除教材
router.delete('/:id', authMiddleware, roleGuard('admin', 'teacher'), asyncHandler(async (req, res) => {
  const material = getOne('SELECT file_url FROM materials WHERE id=?', [req.params.id]);
  if (material && material.file_url) {
    const filePath = path.join(__dirname, '..', material.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  run('DELETE FROM chapters WHERE material_id=?', [req.params.id]);
  run('DELETE FROM materials WHERE id=?', [req.params.id]);
  res.json({ code: 200, message: '删除成功' });
}));

module.exports = router;
