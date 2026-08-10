import { query } from '../db.js';

/**
 * 将 pg DATE / Date / 字符串格式化为 YYYY-MM-DD。
 * DATE 经 pg 会变成 JS Date；若用本地时区序列化可能导致日期偏移一天，故用 UTC 取年月日。
 * @param {Date | string | null | undefined} value - 原始日期值
 * @returns {string | null} YYYY-MM-DD 或 null
 */
function formatDateOnly(value) {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return String(value).slice(0, 10);
}

/**
 * 金额四舍五入到分。
 * @param {number} amount - 原始金额
 * @returns {number} 保留两位小数的 number
 */
function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

/**
 * 将 trips 表行映射为 API Trip 对象（snake_case → camelCase）。
 * @param {Record<string, unknown>} row - 数据库行
 * @returns {{
 *   id: number,
 *   name: string,
 *   destination: string,
 *   startDate: string,
 *   endDate: string,
 *   budget: number,
 *   note: string | null,
 *   createdAt: string
 * }}
 */
export function mapTripRow(row) {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at);

  return {
    id: Number(row.id),
    name: row.name,
    destination: row.destination,
    startDate: formatDateOnly(row.start_date),
    endDate: formatDateOnly(row.end_date),
    budget: roundMoney(row.budget),
    note: row.note == null ? null : String(row.note),
    createdAt,
  };
}

/**
 * 列出全部行程，按 created_at 倒序。
 * @returns {Promise<ReturnType<typeof mapTripRow>[]>}
 */
export async function listTrips() {
  const result = await query(
    `SELECT id, name, destination, start_date, end_date, budget, note, created_at
     FROM trips
     ORDER BY created_at DESC`,
  );
  return result.rows.map(mapTripRow);
}

/**
 * 按主键查询行程。
 * @param {number} id - 行程 ID
 * @returns {Promise<ReturnType<typeof mapTripRow> | null>}
 */
export async function getTripById(id) {
  const result = await query(
    `SELECT id, name, destination, start_date, end_date, budget, note, created_at
     FROM trips
     WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapTripRow(result.rows[0]);
}

/**
 * 创建行程。
 * @param {{
 *   name: string,
 *   destination: string,
 *   startDate: string,
 *   endDate: string,
 *   budget: number,
 *   note: string | null
 * }} data - 已校验的行程字段
 * @returns {Promise<ReturnType<typeof mapTripRow>>}
 */
export async function createTrip(data) {
  const result = await query(
    `INSERT INTO trips (name, destination, start_date, end_date, budget, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, destination, start_date, end_date, budget, note, created_at`,
    [
      data.name,
      data.destination,
      data.startDate,
      data.endDate,
      roundMoney(data.budget),
      data.note,
    ],
  );
  return mapTripRow(result.rows[0]);
}

/**
 * 全量更新行程可写字段（不修改 created_at）。
 * @param {number} id - 行程 ID
 * @param {{
 *   name: string,
 *   destination: string,
 *   startDate: string,
 *   endDate: string,
 *   budget: number,
 *   note: string | null
 * }} data - 已校验的行程字段
 * @returns {Promise<ReturnType<typeof mapTripRow> | null>} 不存在时返回 null
 */
export async function updateTrip(id, data) {
  const result = await query(
    `UPDATE trips
     SET name = $1,
         destination = $2,
         start_date = $3,
         end_date = $4,
         budget = $5,
         note = $6
     WHERE id = $7
     RETURNING id, name, destination, start_date, end_date, budget, note, created_at`,
    [
      data.name,
      data.destination,
      data.startDate,
      data.endDate,
      roundMoney(data.budget),
      data.note,
      id,
    ],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapTripRow(result.rows[0]);
}

/**
 * 删除行程（子表由 ON DELETE CASCADE 清理）。
 * @param {number} id - 行程 ID
 * @returns {Promise<boolean>} 是否删除到记录
 */
export async function deleteTrip(id) {
  const result = await query(
    `DELETE FROM trips
     WHERE id = $1
     RETURNING id`,
    [id],
  );
  return result.rows.length > 0;
}
