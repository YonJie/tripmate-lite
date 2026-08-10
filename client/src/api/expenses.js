import http from './http.js';

/**
 * 获取行程下的费用列表。
 * @param {number|string} tripId 行程 ID
 * @returns {Promise<object[]>} Expense 数组
 */
export function listExpenses(tripId) {
  return http.get(`/trips/${tripId}/expenses`).then((res) => res.data);
}

/**
 * 创建费用记录。
 * @param {number|string} tripId 行程 ID
 * @param {{ name: string, amount: number, category: string, spendDate: string }} payload 请求体
 * @returns {Promise<object>} 创建后的 Expense
 */
export function createExpense(tripId, payload) {
  return http
    .post(`/trips/${tripId}/expenses`, payload)
    .then((res) => res.data);
}

/**
 * 删除费用记录。
 * @param {number|string} id 费用 ID
 * @returns {Promise<void>}
 */
export function deleteExpense(id) {
  return http.delete(`/expenses/${id}`).then(() => undefined);
}

/**
 * 获取行程预算汇总。
 * @param {number|string} tripId 行程 ID
 * @returns {Promise<object>} summary 对象
 */
export function getSummary(tripId) {
  return http.get(`/trips/${tripId}/summary`).then((res) => res.data);
}
