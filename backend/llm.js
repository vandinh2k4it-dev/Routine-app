const Anthropic = require('@anthropic-ai/sdk');

// Lớp gọi AI dùng chung: có GEMINI_API_KEY thì dùng Gemini, không thì Claude nếu có ANTHROPIC_API_KEY.

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

/** Lỗi có mã HTTP và thông báo tiếng Việt cho người dùng. */
class AiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Giới hạn số lần gọi theo người dùng (theo từng instance) để tránh tốn tiền / vượt hạn mức ngoài ý muốn. */
function makeLimiter(limit, windowMs) {
  const calls = new Map();
  return (uid) => {
    const now = Date.now();
    const arr = (calls.get(uid) || []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) { calls.set(uid, arr); return false; }
    arr.push(now); calls.set(uid, arr);
    return true;
  };
}

let customClaude = false;
let claudeFactory = () => new Anthropic(); // ANTHROPIC_API_KEY lấy từ biến môi trường
const setClaudeFactory = (f) => { claudeFactory = f; customClaude = true; }; // dùng cho kiểm thử

const which = () => {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (customClaude || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return 'claude';
  return null;
};
const hasProvider = () => which() !== null;
const NOT_ENABLED = 'Tính năng AI chưa được bật trên máy chủ (thiếu GEMINI_API_KEY).';

function geminiFail(status, msg) {
  console.error('Gemini lỗi', status, msg);
  if (status === 429) return new AiError(429, 'AI đã hết hạn mức hoặc đang quá tải, thử lại sau ít phút');
  if (status === 403 || /API key/i.test(msg)) return new AiError(503, 'Khóa API Gemini trên máy chủ không hợp lệ hoặc chưa được cấp quyền');
  if (status === 404) return new AiError(503, 'Model Gemini không tồn tại, hãy kiểm tra biến GEMINI_MODEL');
  return new AiError(502, 'AI không xử lý được yêu cầu này, thử lại');
}

async function geminiCall(body) {
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('Gemini lỗi mạng:', e.message);
    throw new AiError(502, 'Không gọi được AI, thử lại sau');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw geminiFail(res.status, data?.error?.message || '');
  if (data.promptFeedback?.blockReason) throw new AiError(422, 'AI từ chối trả lời yêu cầu này');
  const cand = data.candidates?.[0];
  if (!cand || ['SAFETY', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY', 'BLOCKLIST'].includes(cand.finishReason)) throw new AiError(422, 'AI từ chối trả lời yêu cầu này');
  return (cand.content?.parts || []).map((p) => p.text || '').join('');
}

async function claudeCall(params) {
  let response;
  try {
    response = await claudeFactory().messages.create({ model: CLAUDE_MODEL, ...params });
  } catch (e) {
    console.error('Claude lỗi:', e.status || '', e.message);
    if (e instanceof Anthropic.AuthenticationError) throw new AiError(503, 'Khóa API Claude trên máy chủ không hợp lệ');
    if (e instanceof Anthropic.RateLimitError) throw new AiError(429, 'AI đang quá tải, thử lại sau ít phút');
    if (e instanceof Anthropic.BadRequestError) throw new AiError(502, 'AI không xử lý được yêu cầu này, thử lại');
    throw new AiError(502, 'Không gọi được AI, thử lại sau');
  }
  if (response.stop_reason === 'refusal') throw new AiError(422, 'AI từ chối trả lời yêu cầu này');
  return (response.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { throw new AiError(502, 'AI trả về kết quả không đọc được, thử lại'); }
}

/** Trả về JSON theo schema. image (tùy chọn) = { mime, data (base64) }. */
async function generateJson({ system, userText, image, geminiSchema, claudeSchema, maxTokens = 8000, effort = 'low' }) {
  const p = which();
  if (p === 'gemini') {
    const text = await geminiCall({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [...(image ? [{ inline_data: { mime_type: image.mime, data: image.data } }] : []), { text: userText }] }],
      generationConfig: { temperature: image ? 0 : 0.5, maxOutputTokens: maxTokens, responseMimeType: 'application/json', responseSchema: geminiSchema },
    });
    return parseJson(text);
  }
  if (p === 'claude') {
    const text = await claudeCall({
      max_tokens: maxTokens,
      output_config: { effort, format: { type: 'json_schema', schema: claudeSchema } },
      system,
      messages: [{ role: 'user', content: [...(image ? [{ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.data } }] : []), { type: 'text', text: userText }] }],
    });
    return parseJson(text);
  }
  throw new AiError(503, NOT_ENABLED);
}

/** Trò chuyện nhiều lượt. messages = [{ role: 'user'|'assistant', content }], lượt cuối là của người dùng. Trả về chuỗi văn bản. */
async function chat({ system, messages }) {
  const p = which();
  if (p === 'gemini') {
    return geminiCall({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.6, maxOutputTokens: 4000 },
    });
  }
  if (p === 'claude') {
    return claudeCall({
      max_tokens: 8000,
      output_config: { effort: 'medium' },
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  }
  throw new AiError(503, NOT_ENABLED);
}

module.exports = { AiError, makeLimiter, setClaudeFactory, hasProvider, generateJson, chat, NOT_ENABLED };
