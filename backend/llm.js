const Anthropic = require('@anthropic-ai/sdk');

// Lớp gọi AI dùng chung. Có thể bật nhiều nhà cung cấp cùng lúc, mỗi nhà một khóa:
//   GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
// Thứ tự thử: Gemini, GPT, Claude (đổi bằng AI_PROVIDER_ORDER, ví dụ "openai,gemini"). Nhà nào quá tải, hết hạn mức
// hoặc quá thời gian thì tự chuyển sang nhà kế tiếp, miễn còn trong giới hạn 60 giây của Vercel Functions.

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// Model dự phòng khi model Gemini chính quá tải (503) hoặc không kịp trả lời; đặt GEMINI_FALLBACK_MODEL=none để tắt
const GEMINI_FALLBACK = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const TOTAL_MS = 55_000; // tổng thời gian cho một yêu cầu AI (Vercel cho tối đa 60 giây)
const MIN_ATTEMPT_MS = 8_000; // còn ít hơn mức này thì không bắt đầu thêm một lần gọi

/** Lỗi có mã HTTP và thông báo tiếng Việt cho người dùng. retryable = nên thử nhà cung cấp khác. */
class AiError extends Error {
  constructor(status, message, retryable = false) { super(message); this.status = status; this.retryable = retryable; }
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

const enabled = {
  gemini: () => !!process.env.GEMINI_API_KEY,
  openai: () => !!process.env.OPENAI_API_KEY,
  claude: () => customClaude || !!process.env.ANTHROPIC_API_KEY || !!process.env.ANTHROPIC_AUTH_TOKEN,
};
/** Các nhà cung cấp đang bật, theo thứ tự sẽ thử. */
function providers() {
  const pref = String(process.env.AI_PROVIDER_ORDER || '').split(',').map((x) => x.trim()).filter((x) => enabled[x]);
  const order = [...new Set([...pref, 'gemini', 'openai', 'claude'])];
  return order.filter((p) => enabled[p]());
}
const hasProvider = () => providers().length > 0;
const NOT_ENABLED = 'Tính năng AI chưa được bật trên máy chủ (thiếu GEMINI_API_KEY, OPENAI_API_KEY hoặc ANTHROPIC_API_KEY).';

const timeoutErr = (e) => e.name === 'TimeoutError' || /timeout|aborted/i.test(e.message || '');
const networkErr = (name, e) => {
  console.error(`${name} lỗi mạng:`, e.message);
  return timeoutErr(e) ? new AiError(504, 'AI trả lời quá lâu, thử lại sau ít phút', true) : new AiError(502, 'Không gọi được AI, thử lại sau', true);
};

// ---------- Gemini (REST generateContent) ----------
function geminiFail(status, msg) {
  console.error('Gemini lỗi', status, msg);
  if (status === 503) return new AiError(503, 'AI đang quá tải, thử lại sau ít phút', true);
  if (status === 429) return new AiError(429, 'AI đã hết hạn mức hoặc đang quá tải, thử lại sau ít phút', true);
  if (status === 403 || /API key/i.test(msg)) return new AiError(503, 'Khóa API Gemini trên máy chủ không hợp lệ hoặc chưa được cấp quyền');
  if (status === 404) return new AiError(503, 'Model Gemini không tồn tại, hãy kiểm tra biến GEMINI_MODEL');
  return new AiError(502, 'AI không xử lý được yêu cầu này, thử lại');
}

async function geminiOnce(model, body, timeoutMs) {
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify(body),
    });
  } catch (e) { throw networkErr(`Gemini (${model})`, e); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw geminiFail(res.status, data?.error?.message || '');
  if (data.promptFeedback?.blockReason) throw new AiError(422, 'AI từ chối trả lời yêu cầu này');
  const cand = data.candidates?.[0];
  if (!cand || ['SAFETY', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY', 'BLOCKLIST'].includes(cand.finishReason)) throw new AiError(422, 'AI từ chối trả lời yêu cầu này');
  return (cand.content?.parts || []).map((p) => p.text || '').join('');
}

async function geminiCall(body, { long, remaining }) {
  const fallback = GEMINI_FALLBACK !== 'none' && GEMINI_FALLBACK !== GEMINI_MODEL ? GEMINI_FALLBACK : null;
  const per = long ? 50_000 : 24_000;
  try {
    return await geminiOnce(GEMINI_MODEL, body, Math.min(per, remaining()));
  } catch (e) {
    if (!e.retryable || !fallback || remaining() < MIN_ATTEMPT_MS) throw e; // 503 trả về rất nhanh nên vẫn còn thời gian thử model dự phòng
    console.error(`Gemini ${GEMINI_MODEL} quá tải, thử model dự phòng ${fallback}`);
    try { return await geminiOnce(fallback, body, Math.min(per, remaining())); } catch (e2) { throw e2.status === 503 && /không tồn tại/.test(e2.message) ? e : e2; }
  }
}

// ---------- OpenAI (Chat Completions) ----------
function openaiFail(status, msg) {
  console.error('OpenAI lỗi', status, msg);
  if (status === 401) return new AiError(503, 'Khóa API OpenAI trên máy chủ không hợp lệ');
  if (status === 429) return new AiError(429, 'AI đã hết hạn mức hoặc đang quá tải, thử lại sau ít phút', true);
  if (status === 404) return new AiError(503, 'Model OpenAI không tồn tại, hãy kiểm tra biến OPENAI_MODEL');
  if (status >= 500) return new AiError(503, 'AI đang quá tải, thử lại sau ít phút', true);
  return new AiError(502, 'AI không xử lý được yêu cầu này, thử lại');
}

async function openaiCall(body, { remaining, long }) {
  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(Math.min(long ? 50_000 : 30_000, remaining())),
      body: JSON.stringify({ model: OPENAI_MODEL, ...body }),
    });
  } catch (e) { throw networkErr('OpenAI', e); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw openaiFail(res.status, data?.error?.message || '');
  const choice = data.choices?.[0];
  if (!choice || choice.message?.refusal || choice.finish_reason === 'content_filter') throw new AiError(422, 'AI từ chối trả lời yêu cầu này');
  return choice.message?.content || '';
}

// ---------- Claude ----------
async function claudeCall(params, { remaining } = {}) {
  let response;
  try {
    response = await claudeFactory().messages.create({ model: CLAUDE_MODEL, ...params }, remaining ? { timeout: Math.min(50_000, remaining()), maxRetries: 0 } : undefined);
  } catch (e) {
    console.error('Claude lỗi:', e.status || '', e.message);
    if (e instanceof Anthropic.AuthenticationError) throw new AiError(503, 'Khóa API Claude trên máy chủ không hợp lệ');
    if (e instanceof Anthropic.RateLimitError || e.status === 529 || e.status >= 500) throw new AiError(429, 'AI đang quá tải, thử lại sau ít phút', true);
    if (e instanceof Anthropic.BadRequestError) throw new AiError(502, 'AI không xử lý được yêu cầu này, thử lại');
    throw new AiError(502, 'Không gọi được AI, thử lại sau', true);
  }
  if (response.stop_reason === 'refusal') throw new AiError(422, 'AI từ chối trả lời yêu cầu này');
  return (response.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { throw new AiError(502, 'AI trả về kết quả không đọc được, thử lại', true); }
}

/** Thử lần lượt các nhà cung cấp đang bật cho tới khi có kết quả. run(provider, ctx) trả kết quả hoặc ném AiError. */
async function withProviders(run, long) {
  const list = providers();
  if (!list.length) throw new AiError(503, NOT_ENABLED);
  const deadline = Date.now() + TOTAL_MS;
  const ctx = { long, remaining: () => Math.max(1000, deadline - Date.now()) };
  let last;
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && deadline - Date.now() < MIN_ATTEMPT_MS) break;
    try {
      return await run(list[i], ctx);
    } catch (e) {
      if (!(e instanceof AiError)) throw e;
      last = e;
      if (!e.retryable) throw e;
      if (i + 1 < list.length) console.error(`${list[i]} không dùng được, chuyển sang ${list[i + 1]}`);
    }
  }
  throw last || new AiError(502, 'Không gọi được AI, thử lại sau');
}

/** Trả về JSON theo schema. image (tùy chọn) = { mime, data (base64) }. */
async function generateJson({ system, userText, image, geminiSchema, claudeSchema, maxTokens = 8000, effort = 'low' }) {
  return withProviders(async (p, ctx) => {
    if (p === 'gemini') {
      return parseJson(await geminiCall({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [...(image ? [{ inline_data: { mime_type: image.mime, data: image.data } }] : []), { text: userText }] }],
        generationConfig: { temperature: image ? 0 : 0.5, maxOutputTokens: maxTokens, responseMimeType: 'application/json', responseSchema: geminiSchema },
      }, ctx));
    }
    if (p === 'openai') {
      return parseJson(await openaiCall({
        max_completion_tokens: maxTokens,
        response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema: claudeSchema } },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [...(image ? [{ type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.data}` } }] : []), { type: 'text', text: userText }] },
        ],
      }, ctx));
    }
    return parseJson(await claudeCall({
      max_tokens: maxTokens,
      output_config: { effort, format: { type: 'json_schema', schema: claudeSchema } },
      system,
      messages: [{ role: 'user', content: [...(image ? [{ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.data } }] : []), { type: 'text', text: userText }] }],
    }, ctx));
  }, !image);
}

/** Trò chuyện nhiều lượt. messages = [{ role: 'user'|'assistant', content }], lượt cuối là của người dùng. Trả về chuỗi văn bản. */
async function chat({ system, messages }) {
  return withProviders(async (p, ctx) => {
    if (p === 'gemini') {
      return geminiCall({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.6, maxOutputTokens: 4000 },
      }, ctx);
    }
    if (p === 'openai') {
      return openaiCall({
        max_completion_tokens: 4000,
        messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
      }, ctx);
    }
    return claudeCall({
      max_tokens: 8000,
      output_config: { effort: 'medium' },
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }, ctx);
  }, true);
}

module.exports = { AiError, makeLimiter, setClaudeFactory, hasProvider, providers, generateJson, chat, NOT_ENABLED };
