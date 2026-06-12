const fs = require('fs');
const path = require('path');

async function parsePDF(input) {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
    const data = await pdfParse(buffer);
    return data.text;
  } catch (e) {
    console.error('PDF parse error:', e.message);
    return null;
  }
}

async function parseWord(input) {
  try {
    const mammoth = require('mammoth');
    if (Buffer.isBuffer(input)) {
      const result = await mammoth.extractRawText({ buffer: input });
      return result.value;
    }
    const result = await mammoth.extractRawText({ path: input });
    return result.value;
  } catch (e) {
    console.error('Word parse error:', e.message);
    return null;
  }
}

function parseTxt(input) {
  try {
    if (Buffer.isBuffer(input)) return input.toString('utf-8');
    return fs.readFileSync(input, 'utf-8');
  } catch (e) {
    try {
      const iconv = require('iconv-lite');
      const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
      return iconv.decode(buffer, 'gbk');
    } catch (e2) {
      console.error('TXT parse error:', e2.message);
      return null;
    }
  }
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function detectChapters(text) {
  if (!text || text.length < 50) {
    return [{ title: '全文内容', content: text, sort_order: 1 }];
  }

  const chapters = [];

  // Pattern 1: 第X章 / 第X节 / Chapter X
  const pattern1 = /^(第[一二三四五六七八九十百零\d]+[章节篇][\s\S]*?)(?=^第[一二三四五六七八九十百零\d]+[章节篇]|$)/gm;
  // Pattern 2: 数字编号 (1. / 1.1 / 一、)
  const pattern2 = /^(\d+\.?\d*\.?\s+[^\n]+[\s\S]*?)(?=^\d+\.?\d*\.?\s+[^\n]|$)/gm;
  // Pattern 3: 大写标题行 (全大写或加粗)
  const pattern3 = /^([A-Z][A-Z\s]{5,}|[一二三四五六七八九十]+[、.][^\n]+[\s\S]*?)(?=^[A-Z][A-Z\s]{5,}|^[一二三四五六七八九十]+[、.]|$)/gm;

  let matches = [];
  const patterns = [
    { regex: pattern1, name: 'chinese' },
    { regex: pattern2, name: 'numbered' },
    { regex: pattern3, name: 'uppercase' }
  ];

  for (const p of patterns) {
    p.regex.lastIndex = 0;
    let match;
    while ((match = p.regex.exec(text)) !== null) {
      matches.push({
        title: match[1].split('\n')[0].trim().substring(0, 100),
        content: match[1].trim(),
        index: match.index
      });
    }
    if (matches.length >= 2) break;
    matches = [];
  }

  if (matches.length >= 2) {
    for (let i = 0; i < matches.length; i++) {
      chapters.push({
        title: matches[i].title || `第${i + 1}部分`,
        content: matches[i].content.substring(0, 5000),
        sort_order: i + 1
      });
    }
  } else {
    // Fallback: split by fixed size
    const chunkSize = 2000;
    const totalChunks = Math.ceil(text.length / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const chunk = text.substring(start, start + chunkSize);
      const firstLine = chunk.split('\n')[0].trim().substring(0, 60);
      chapters.push({
        title: firstLine || `第${i + 1}部分`,
        content: chunk,
        sort_order: i + 1
      });
    }
  }

  return chapters;
}

// Accepts either a file path (string) or a buffer
async function parseDocument(input, fileType) {
  let text = null;

  switch (fileType) {
    case 'pdf':
      text = await parsePDF(input);
      break;
    case 'docx':
    case 'doc':
      text = await parseWord(input);
      break;
    case 'txt':
      text = parseTxt(input);
      break;
    default:
      text = null;
  }

  if (!text) {
    return { text: null, chapters: [] };
  }

  text = cleanText(text);
  const chapters = detectChapters(text);

  return { text, chapters };
}

module.exports = { parseDocument, detectChapters, cleanText };
