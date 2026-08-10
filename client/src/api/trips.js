import http from './http.js';

/**
 * 获取行程列表。
 * @returns {Promise<object[]>} Trip 数组
 */
export function listTrips() {
  return http.get('/trips').then((res) => res.data);
}

/**
 * 获取单个行程详情。
 * @param {number|string} id 行程 ID
 * @returns {Promise<object>} Trip
 */
export function getTrip(id) {
  return http.get(`/trips/${id}`).then((res) => res.data);
}

/**
 * 创建行程。
 * @param {{ name: string, destination: string, startDate: string, endDate: string, budget: number, note?: string|null }} payload 请求体
 * @returns {Promise<object>} 创建后的 Trip
 */
export function createTrip(payload) {
  return http.post('/trips', payload).then((res) => res.data);
}

/**
 * 全量更新行程。
 * @param {number|string} id 行程 ID
 * @param {{ name: string, destination: string, startDate: string, endDate: string, budget: number, note?: string|null }} payload 请求体
 * @returns {Promise<object>} 更新后的 Trip
 */
export function updateTrip(id, payload) {
  return http.put(`/trips/${id}`, payload).then((res) => res.data);
}

/**
 * 删除行程（级联删除景点与费用）。
 * @param {number|string} id 行程 ID
 * @returns {Promise<void>}
 */
export function deleteTrip(id) {
  return http.delete(`/trips/${id}`).then(() => undefined);
}
