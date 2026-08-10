import { callDeepSeek } from './deepseek.js';
import { buildMockSuggestion } from './mock.js';

/**
 * 将 DeepSeek 错误映射为人类可读的中文降级原因。
 * @param {Error & { code?: string, httpStatus?: number, detail?: string }} err - 捕获的错误
 * @returns {string}
 */
function mapFallbackReason(err) {
  const timeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS) || 15000;
  const timeoutSec = Math.round(timeoutMs / 1000);

  switch (err.code) {
    case 'NO_API_KEY':
      return '未配置 DEEPSEEK_API_KEY';
    case 'TIMEOUT':
      return `请求超时（${timeoutSec} 秒）`;
    case 'HTTP':
      if (err.httpStatus === 429) {
        return 'DeepSeek 返回 HTTP 429';
      }
      return `DeepSeek 返回 HTTP ${err.httpStatus ?? '未知'}`;
    case 'INVALID_JSON':
      return '响应不是合法 JSON';
    case 'SCHEMA':
      return `响应结构校验未通过：${err.detail || err.message}`;
    default:
      return err.message || 'DeepSeek 调用失败，已降级为 Mock';
  }
}

/**
 * 编排 DeepSeek 真调与 Mock 降级；本函数保证不向外抛错。
 * @param {{ destination: string, days: number, budget: number }} input - 最终入参
 * @returns {Promise<{
 *   source: 'deepseek' | 'mock',
 *   fallbackReason: string | null,
 *   data: object
 * }>}
 */
export async function getSuggestion({ destination, days, budget }) {
  try {
    const data = await callDeepSeek({ destination, days, budget });
    return {
      source: 'deepseek',
      fallbackReason: null,
      data,
    };
  } catch (err) {
    const fallbackReason = mapFallbackReason(err);
    console.warn(`[ai] DeepSeek 降级为 Mock：${fallbackReason}`);
    return {
      source: 'mock',
      fallbackReason,
      data: buildMockSuggestion({ destination, days, budget }),
    };
  }
}
