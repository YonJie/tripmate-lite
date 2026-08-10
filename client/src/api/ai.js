import http from './http.js';

/**
 * 请求 AI 行程建议（单独 25s 超时，不改全局 http 超时）。
 * @param {{ destination?: string, days?: number, budget?: number, tripId?: number }} payload 请求体
 * @returns {Promise<object>} 建议响应（含 source / data 等）
 */
export function getSuggestion(payload) {
  return http
    .post('/ai/suggest', payload, { timeout: 25000 })
    .then((res) => res.data);
}
