import { validateSuggestData } from './validateSuggestData.js';

/**
 * 调用 DeepSeek Chat Completions，解析并校验 JSON 建议。
 * @param {{ destination: string, days: number, budget: number }} input
 * @returns {Promise<
 *   | { ok: true, data: object }
 *   | { ok: false, reason: string }
 * >}
 */
export async function callDeepseekSuggest(input) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey == null || String(apiKey).trim() === '') {
    return { ok: false, reason: '缺少 DEEPSEEK_API_KEY，已降级为 Mock' };
  }

  const baseUrl = (
    process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  ).replace(/\/$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const timeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS) || 15000;

  const systemPrompt =
    '你是旅行规划助手。只输出合法 JSON 对象，不要 Markdown 代码块或其它文字。' +
    '字段：summary(string)、days(array)、budgetPlan(array)、tips(string[]，至少3条)。' +
    'days[].day 从1起；days[].items[] 含 time(上午|下午|晚上)、name、type(景点|餐饮|交通|其他)、estimatedCost(number>=0)、note。' +
    'budgetPlan[] 含 category(交通|住宿|餐饮|门票|其他)、amount、percent、note；金额之和接近预算。';

  const userPrompt = JSON.stringify({
    destination: input.destination,
    days: input.days,
    budget: input.budget,
    instruction: `请为目的地「${input.destination}」规划 ${input.days} 天行程，总预算约 ${input.budget} 元；days 长度必须等于 ${input.days}。`,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: `DeepSeek HTTP ${response.status}，已降级为 Mock`,
      };
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      return { ok: false, reason: 'DeepSeek 响应为空，已降级为 Mock' };
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, reason: 'DeepSeek 响应 JSON 解析失败，已降级为 Mock' };
    }

    const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    const check = validateSuggestData(data);
    if (!check.ok) {
      return {
        ok: false,
        reason: `DeepSeek 字段校验失败（${check.reason}），已降级为 Mock`,
      };
    }

    if (data.days.length !== input.days) {
      return {
        ok: false,
        reason: `DeepSeek days 长度与入参不一致，已降级为 Mock`,
      };
    }

    return { ok: true, data };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { ok: false, reason: 'DeepSeek 请求超时，已降级为 Mock' };
    }
    return {
      ok: false,
      reason: `DeepSeek 调用失败（${err?.message || '未知错误'}），已降级为 Mock`,
    };
  } finally {
    clearTimeout(timer);
  }
}
