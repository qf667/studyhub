const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_API_URL = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

const QUESTION_PROMPTS = {
  single_choice: `你是一位专业的教育出题专家。请根据以下教材内容生成指定数量的单选题。

教材内容：
{content}

要求：
- 生成 {count} 道单选题
- 难度：{difficulty}
- 每题有4个选项（A/B/C/D），只有一个正确答案
- 选项要有合理的干扰性
- 必须包含答案解析

请严格按以下JSON格式返回，不要包含其他文字：
{
  "questions": [
    {
      "content": "题目内容",
      "options": ["A.选项1", "B.选项2", "C.选项3", "D.选项4"],
      "answer": "A",
      "explanation": "解析内容",
      "knowledge_point": "知识点"
    }
  ]
}`,

  multiple_choice: `你是一位专业的教育出题专家。请根据以下教材内容生成多选题。

教材内容：
{content}

要求：
- 生成 {count} 道多选题
- 难度：{difficulty}
- 每题有4-5个选项，有2-4个正确答案
- 答案用逗号分隔，如 "A,B,C"

请严格按以下JSON格式返回：
{
  "questions": [
    {
      "content": "题目内容",
      "options": ["A.选项1", "B.选项2", "C.选项3", "D.选项4"],
      "answer": "A,B",
      "explanation": "解析内容",
      "knowledge_point": "知识点"
    }
  ]
}`,

  true_false: `你是一位专业的教育出题专家。请根据以下教材内容生成判断题。

教材内容：
{content}

要求：
- 生成 {count} 道判断题
- 难度：{difficulty}
- 答案只能是"正确"或"错误"
- 题目表述要清晰，避免歧义

请严格按以下JSON格式返回：
{
  "questions": [
    {
      "content": "题目内容",
      "options": ["正确", "错误"],
      "answer": "正确",
      "explanation": "解析内容",
      "knowledge_point": "知识点"
    }
  ]
}`,

  fill_blank: `你是一位专业的教育出题专家。请根据以下教材内容生成填空题。

教材内容：
{content}

要求：
- 生成 {count} 道填空题
- 难度：{difficulty}
- 用 ____ 标记空格位置
- 答案为填入空格的内容

请严格按以下JSON格式返回：
{
  "questions": [
    {
      "content": "题目内容，____处需要填写",
      "options": null,
      "answer": "正确答案",
      "explanation": "解析内容",
      "knowledge_point": "知识点"
    }
  ]
}`,

  short_answer: `你是一位专业的教育出题专家。请根据以下教材内容生成简答题。

教材内容：
{content}

要求：
- 生成 {count} 道简答题
- 难度：{difficulty}
- 题目要能考察对知识点的理解和应用
- 参考答案要完整、有条理

请严格按以下JSON格式返回：
{
  "questions": [
    {
      "content": "题目内容",
      "options": null,
      "answer": "参考答案",
      "explanation": "评分要点",
      "knowledge_point": "知识点"
    }
  ]
}`
};

const CHAT_SYSTEM_PROMPT = `你是一位耐心、专业的教育辅导助手。你的职责是帮助学生理解课程内容。

回答要求：
- 语言简洁易懂，适合学生理解
- 适当举例说明
- 如涉及公式或代码，使用Markdown格式展示
- 如果问题超出课程范围，请礼貌地告知学生该内容不在当前课程范围内
- 鼓励学生思考，不要直接给出所有答案`;

async function callAI(messages, options = {}) {
  if (!AI_API_KEY) {
    return null;
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify({
          model: options.model || AI_MODEL,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4000
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error(`AI call attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt === maxRetries) return null;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

async function generateQuestions(chapterText, questionType, difficulty, count) {
  const promptTemplate = QUESTION_PROMPTS[questionType];
  if (!promptTemplate) return null;

  const prompt = promptTemplate
    .replace('{content}', chapterText.substring(0, 3000))
    .replace('{difficulty}', difficulty)
    .replace('{count}', count);

  const result = await callAI([
    { role: 'system', content: '你是专业教育出题助手，只输出JSON格式内容。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.7 });

  if (!result) return null;

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.questions || [];
  } catch (e) {
    console.error('AI response parse error:', e.message);
    return null;
  }
}

async function chatWithAI(message, courseContext, history = []) {
  const messages = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT + (courseContext ? `\n\n课程信息：${courseContext}` : '') },
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  return await callAI(messages, { temperature: 0.8 });
}

async function gradeShortAnswer(question, referenceAnswer, studentAnswer) {
  const prompt = `你是一位公正的阅卷老师。请根据参考答案为学生的简答题评分。

题目：${question}
参考答案：${referenceAnswer}
学生答案：${studentAnswer}

请按以下JSON格式返回评分结果：
{
  "score": 0-100的分数,
  "comment": "评语，指出优点和不足"
}`;

  const result = await callAI([
    { role: 'user', content: prompt }
  ], { temperature: 0.3 });

  if (!result) return null;

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    return null;
  }
}

module.exports = {
  generateQuestions, chatWithAI, gradeShortAnswer,
  QUESTION_PROMPTS, CHAT_SYSTEM_PROMPT, callAI
};
