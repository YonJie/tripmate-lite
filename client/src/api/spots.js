import http from './http.js';

/**
 * 获取行程下的景点列表。
 * @param {number|string} tripId 行程 ID
 * @returns {Promise<object[]>} Spot 数组
 */
export function listSpots(tripId) {
  return http.get(`/trips/${tripId}/spots`).then((res) => res.data);
}

/**
 * 创建景点。
 * @param {number|string} tripId 行程 ID
 * @param {{ name: string, type: string, estimatedCost?: number, status?: string }} payload 请求体
 * @returns {Promise<object>} 创建后的 Spot
 */
export function createSpot(tripId, payload) {
  return http.post(`/trips/${tripId}/spots`, payload).then((res) => res.data);
}

/**
 * 部分更新景点。
 * @param {number|string} id 景点 ID
 * @param {{ name?: string, type?: string, estimatedCost?: number, status?: string }} payload 请求体
 * @returns {Promise<object>} 更新后的 Spot
 */
export function updateSpot(id, payload) {
  return http.patch(`/spots/${id}`, payload).then((res) => res.data);
}

/**
 * 删除景点。
 * @param {number|string} id 景点 ID
 * @returns {Promise<void>}
 */
export function deleteSpot(id) {
  return http.delete(`/spots/${id}`).then(() => undefined);
}

/**
 * 批量创建景点（AI 导入）。
 * @param {number|string} tripId 行程 ID
 * @param {{ items: Array<{ name: string, type: string, estimatedCost?: number, status?: string }> }} payload 请求体
 * @returns {Promise<object[]>} Spot 数组
 */
export function bulkCreateSpots(tripId, payload) {
  return http
    .post(`/trips/${tripId}/spots/bulk`, payload)
    .then((res) => res.data);
}
