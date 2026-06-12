const express = require('express');
const { getOne, getAll, run } = require('../db');
const { authMiddleware, roleGuard, asyncHandler } = require('../middleware/auth');
const { generateQuestions: aiGenerateQuestions, chatWithAI } = require('../services/aiService');

const router = express.Router();

// Fallback mock question bank (used when AI API is not configured)
const MOCK_QUESTION_BANK = {
  single_choice: [
    {
      content: '以下哪个选项最准确地描述了本章的核心概念？',
      options: ['A.基础定义与理论框架', 'B.实践应用与案例分析', 'C.历史发展与演变过程', 'D.前沿研究与未来展望'],
      answer: 'A', explanation: '本章核心概念主要围绕基础定义与理论框架展开。', knowledge_point: '核心概念'
    },
    {
      content: '在学习过程中，以下哪种方法最有助于理解抽象概念？',
      options: ['A.死记硬背', 'B.类比与举例', 'C.跳过不看', 'D.只看结论'],
      answer: 'B', explanation: '类比与举例能够将抽象概念具体化。', knowledge_point: '学习方法'
    },
    {
      content: '本章提到的理论模型中，最关键的因素是什么？',
      options: ['A.输入变量', 'B.处理过程', 'C.输出结果', 'D.反馈机制'],
      answer: 'D', explanation: '反馈机制决定了系统的自我调节能力。', knowledge_point: '理论模型'
    }
  ],
  multiple_choice: [
    {
      content: '以下哪些是本章重点介绍的知识点？（多选）',
      options: ['A.基本概念定义', 'B.核心原理分析', 'C.实际应用案例', 'D.考试技巧总结'],
      answer: 'A,B,C', explanation: '本章重点涵盖基本概念、核心原理和实际应用。', knowledge_point: '知识点概述'
    }
  ],
  true_false: [
    {
      content: '本章内容是整个课程体系的基础，后续章节都以此为前提。',
      options: ['正确', '错误'], answer: '正确', explanation: '本章奠定了整个课程的理论基础。', knowledge_point: '课程结构'
    },
    {
      content: '理论知识在实际应用中没有任何价值。',
      options: ['正确', '错误'], answer: '错误', explanation: '理论知识为实践提供指导框架。', knowledge_point: '理论与实践'
    }
  ],
  fill_blank: [
    {
      content: '本章介绍的核心理论最早由____提出。',
      answer: '相关领域专家', explanation: '该理论的提出对学科发展产生了深远影响。', knowledge_point: '理论起源'
    },
    {
      content: '在实际应用中，需要考虑____和____两个关键因素。',
      answer: '理论基础,实践条件', explanation: '理论基础提供方向，实践条件决定可行性。', knowledge_point: '应用要素'
    }
  ],
  short_answer: [
    {
      content: '请简述本章核心概念的含义及其重要性。',
      answer: '核心概念是指本章围绕的主要理论框架，它为后续学习提供了基础支撑。',
      explanation: '回答应包含概念定义和重要性两方面。', knowledge_point: '核心概念'
    }
  ]
};

// AI生成习题 - tries real AI first, falls back to mock
router.post('/generate-questions', authMiddleware, roleGuard('admin', 'teacher'), asyncHandler(async (req, res) => {
  const { chapter_id, material_id, course_id, type, difficulty = 'medium', count = 5 } = req.body;

  let chapterContent = '';
  if (chapter_id) {
    const chapter = await getOne('SELECT content FROM chapters WHERE id=?', [chapter_id]);
    chapterContent = chapter ? chapter.content : '';
  }
  if (!chapterContent && material_id) {
    const material = await getOne('SELECT extracted_text FROM materials WHERE id=?', [material_id]);
    chapterContent = material ? material.extracted_text : '';
  }

  // Try real AI generation
  if (chapterContent) {
    const types = type ? [type] : ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer'];
    const allQuestions = [];

    for (const t of types) {
      const aiQuestions = await aiGenerateQuestions(chapterContent, t, difficulty, parseInt(count));
      if (aiQuestions && aiQuestions.length > 0) {
        for (const q of aiQuestions) {
          allQuestions.push({ ...q, type: t, difficulty, source: 'ai' });
        }
      }
    }

    if (allQuestions.length > 0) {
      return res.json({ code: 200, data: { questions: allQuestions, total: allQuestions.length, source: 'ai' } });
    }
  }

  // Fallback to mock bank
  const types = type ? [type] : Object.keys(MOCK_QUESTION_BANK);
  const generated = [];
  for (const t of types) {
    const bank = MOCK_QUESTION_BANK[t] || [];
    const num = Math.min(parseInt(count), bank.length);
    for (let i = 0; i < num; i++) {
      generated.push({ ...bank[i], type: t, difficulty, source: 'mock' });
    }
  }

  res.json({ code: 200, data: { questions: generated, total: generated.length, source: 'mock' } });
}));

// 保存AI生成的习题
router.post('/save-questions', authMiddleware, roleGuard('admin', 'teacher'), asyncHandler(async (req, res) => {
  const { questions, course_id, material_id, chapter_id } = req.body;
  if (!Array.isArray(questions)) return res.json({ code: 400, message: '题目格式错误' });

  let saved = 0;
  for (const q of questions) {
    await run(
      `INSERT INTO questions (course_id, material_id, chapter_id, type, difficulty, content, options, answer, explanation, knowledge_point, score, source, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id || null, material_id || null, chapter_id || null,
       q.type, q.difficulty || 'medium', q.content,
       q.options ? JSON.stringify(q.options) : null,
       q.answer, q.explanation || null, q.knowledge_point || null,
       q.score || 1, q.source || 'ai', req.user.id]
    );
    saved++;
  }
  res.json({ code: 200, message: `成功保存${saved}道题目`, data: { saved } });
}));

// AI智能问答 - tries real AI, falls back to mock
router.post('/chat', authMiddleware, roleGuard('teacher', 'student'), asyncHandler(async (req, res) => {
  const { message, course_id } = req.body;
  if (!message) return res.json({ code: 400, message: '消息不能为空' });

  await run('INSERT INTO chat_history (user_id, course_id, role, content) VALUES (?, ?, ?, ?)',
    [req.user.id, course_id || null, 'user', message]);

  let courseContext = '';
  if (course_id) {
    const course = await getOne('SELECT name, description FROM courses WHERE id=?', [course_id]);
    if (course) courseContext = `课程名称：${course.name}\n课程描述：${course.description || ''}`;

    const materials = await getAll('SELECT title, extracted_text FROM materials WHERE course_id=? ORDER BY id DESC LIMIT 2', [course_id]);
    if (materials.length > 0) {
      courseContext += '\n\n教材内容摘要：\n' + materials.map(m => `${m.title}: ${(m.extracted_text || '').substring(0, 500)}`).join('\n');
    }
  }

  const history = (await getAll(
    'SELECT role, content FROM chat_history WHERE user_id=? AND (course_id=? OR (course_id IS NULL AND ? IS NULL)) ORDER BY created_at DESC LIMIT 10',
    [req.user.id, course_id || null, course_id || null]
  )).reverse();

  const aiResponse = await chatWithAI(message, courseContext, history);

  let response;
  if (aiResponse) {
    response = aiResponse;
  } else {
    const course = course_id ? await getOne('SELECT name FROM courses WHERE id=?', [course_id]) : null;
    const courseName = course ? course.name : '当前课程';
    const mockResponses = [
      `关于"${message}"这个问题，在《${courseName}》中，我们可以从以下几个角度来理解：\n\n1. **基本概念**：首先需要明确相关的基础定义\n2. **核心原理**：其次理解其背后的运作机制\n3. **实际应用**：最后通过实例加深理解\n\n建议你结合教材内容进行深入学习。`,
      `这是一个很好的问题！在${courseName}的学习中，这个问题涉及到关键知识点。\n\n**要点解析**：\n- 该概念的核心在于理解其本质特征\n- 与之前学过的内容有密切联系\n- 在实际场景中有广泛应用\n\n如果你还有疑问，可以查看教材中的相关章节。`,
      `针对你的问题，我来详细解答：\n\n${courseName}中的这个知识点是非常重要的。主要包含以下内容：\n\n1. 理论基础：源自相关学科的基本原理\n2. 方法论：提供了解决问题的思路和框架\n3. 实践指导：可以应用于实际场景\n\n**学习建议**：建议先掌握基础概念，再逐步深入理解其应用。`
    ];
    response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  await run('INSERT INTO chat_history (user_id, course_id, role, content) VALUES (?, ?, ?, ?)',
    [req.user.id, course_id || null, 'assistant', response]);

  res.json({ code: 200, data: { message: response, source: aiResponse ? 'ai' : 'mock' } });
}));

// SSE streaming chat endpoint
router.post('/chat/stream', authMiddleware, roleGuard('teacher', 'student'), asyncHandler(async (req, res) => {
  const { message, course_id } = req.body;
  if (!message) return res.json({ code: 400, message: '消息不能为空' });

  await run('INSERT INTO chat_history (user_id, course_id, role, content) VALUES (?, ?, ?, ?)',
    [req.user.id, course_id || null, 'user', message]);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let courseContext = '';
  if (course_id) {
    const course = await getOne('SELECT name, description FROM courses WHERE id=?', [course_id]);
    if (course) courseContext = `课程名称：${course.name}\n课程描述：${course.description || ''}`;
  }

  const history = (await getAll(
    'SELECT role, content FROM chat_history WHERE user_id=? AND (course_id=? OR (course_id IS NULL AND ? IS NULL)) ORDER BY created_at DESC LIMIT 10',
    [req.user.id, course_id || null, course_id || null]
  )).reverse();

  const aiResponse = await chatWithAI(message, courseContext, history);
  const response = aiResponse || '抱歉，AI服务暂时不可用，请稍后再试。';

  const words = response.split('');
  let fullResponse = '';
  for (let i = 0; i < words.length; i++) {
    fullResponse += words[i];
    res.write(`data: ${JSON.stringify({ content: words[i], done: false })}\n\n`);
    if (i % 5 === 0) {
      await new Promise(r => setTimeout(r, 10));
    }
  }
  res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
  res.end();

  await run('INSERT INTO chat_history (user_id, course_id, role, content) VALUES (?, ?, ?, ?)',
    [req.user.id, course_id || null, 'assistant', response]);
}));

// 对话历史
router.get('/chat/history', authMiddleware, asyncHandler(async (req, res) => {
  const { course_id } = req.query;
  let where = 'user_id=?';
  let params = [req.user.id];
  if (course_id) { where += ' AND course_id=?'; params.push(parseInt(course_id)); }

  const history = await getAll(
    `SELECT * FROM chat_history WHERE ${where} ORDER BY created_at ASC LIMIT 100`,
    params
  );
  res.json({ code: 200, data: history });
}));

// 清空历史
router.delete('/chat/history', authMiddleware, asyncHandler(async (req, res) => {
  await run('DELETE FROM chat_history WHERE user_id=?', [req.user.id]);
  res.json({ code: 200, message: '已清空对话历史' });
}));

module.exports = router;
