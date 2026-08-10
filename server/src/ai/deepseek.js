import { validateSuggestion } from './schema.js';

/**
 * @typedef {'NO_API_KEY' | 'TIMEOUT' | 'HTTP' | 'INVALID_JSON' | 'SCHEMA' | 'OTHER'} DeepSeekErrorCode
 */

/**
 * 构造带 code 标记的 DeepSeek 调用错误。
 * @param {string} message - 错误信息
 * @param {DeepSeekErrorCode} code - 错误分类
 * @param {{ httpStatus?: number, detail?: string }} [extra] - 附加字段
 * @returns {Error & { code: DeepSeekErrorCode, httpStatus?: number, detail?: string }}
 */
function createDeepSeekError(message, code, extra = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

/**
 * 剥掉 ```json ... ``` 代码块围栏后再解析。
 * @param {string} text - 模型原始 content
 * @returns {string}
 */
function stripJsonFence(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * 目标 JSON 结构示例（须出现在含 "json" 字样的 system prompt 中）。
 */
const JSON_SHAPE_EXAMPLE = `{
  "summary": "一句话总述",
  "days": [
    {
      "day": 1,
      "title": "当日主题",
      "items": [
        {
          "time": "上午",
          "name": "活动名称",
          "type": "景点",
          "estimatedCost": 0,
          "note": "简短说明"
        },
        {
          "time": "下午",
          "name": "活动名称",
          "type": "餐饮",
          "estimatedCost": 100,
          "note": "简短说明"
        },
        {
          "time": "晚上",
          "name": "活动名称",
          "type": "交通",
          "estimatedCost": 20,
          "note": "简短说明"
        }
      ]
    }
  ],
  "budgetPlan": [
    { "category": "交通", "amount": 300, "percent": 20, "note": "说明" },
    { "category": "住宿", "amount": 525, "percent": 35, "note": "说明" },
    { "category": "餐饮", "amount": 375, "percent": 25, "note": "说明" },
    { "category": "门票", "amount": 225, "percent": 15, "note": "说明" },
    { "category": "其他", "amount": 75, "percent": 5, "note": "说明" }
  ],
  "tips": ["提示1", "提示2", "提示3"]
}`;

/**
 * 调用 DeepSeek Chat Completions，解析并校验行程建议 JSON。
 * @param {{ destination: string, days: number, budget: number }} input - 最终入参
 * @returns {Promise<object>} 通过校验的 data 对象
 */
export async function callDeepSeek({ destination, days, budget }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey == null || String(apiKey).trim() === '') {
    throw createDeepSeekError('未配置 DEEPSEEK_API_KEY', 'NO_API_KEY');
  }

  const baseUrl = (
    process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  ).replace(/\/$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const parsedTimeout = Number(process.env.DEEPSEEK_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 15000;

  const systemPrompt = [
    '你是专业的旅行规划师。根据用户提供的目的地、天数和预算，生成一份行程建议，并以 json 格式返回，结构严格如下（不要输出任何额外文字）：',
    JSON_SHAPE_EXAMPLE,
    '约束：days 数组长度必须等于用户指定的天数；每天 2–4 个 items 即可；budgetPlan 五项齐全且 amount 之和接近用户预算；tips 恰好 3 条且具体可执行；所有金额为数字不带货币符号；type 只能取「景点/餐饮/交通/其他」；category 只能取「交通/住宿/餐饮/门票/其他」；time 只能取「上午/下午/晚上」。请尽量简洁，控制输出长度。',
  ].join('\n');

  const userPrompt = `请为目的地「${destination}」规划 ${days} 天行程，总预算约 ${budget} 元。days 长度必须等于 ${days}，内容需与该目的地相关。请只输出 json 对象。`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw createDeepSeekError(
        `DeepSeek 返回 HTTP ${response.status}`,
        'HTTP',
        { httpStatus: response.status },
      );
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw createDeepSeekError('响应不是合法 JSON', 'INVALID_JSON');
    }

    let parsed;
    try {
      parsed = JSON.parse(stripJsonFence(content));
    } catch {
      throw createDeepSeekError('响应不是合法 JSON', 'INVALID_JSON');
    }

    const data =
      parsed?.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
        ? parsed.data
        : parsed;

    const check = validateSuggestion(data);
    if (!check.valid) {
      throw createDeepSeekError(
        `响应结构校验未通过：${check.reason}`,
        'SCHEMA',
        { detail: check.reason || '' },
      );
    }

    if (!Array.isArray(data.days) || data.days.length !== days) {
      throw createDeepSeekError(
        `响应结构校验未通过：days 长度须等于 ${days}`,
        'SCHEMA',
        { detail: `days 长度须等于 ${days}` },
      );
    }

    console.log(`[ai] DeepSeek 成功，耗时 ${Date.now() - startedAt}ms`);
    return data;
  } catch (err) {
    const aborted =
      err?.name === 'AbortError' ||
      err?.code === 'ABORT_ERR' ||
      /aborted|abort/i.test(String(err?.message || ''));
    if (aborted && !err?.code) {
      throw createDeepSeekError('请求超时', 'TIMEOUT');
    }
    if (err?.code) {
      throw err;
    }
    throw createDeepSeekError(err?.message || 'DeepSeek 调用失败', 'OTHER');
  } finally {
    clearTimeout(timer);
  }
}
