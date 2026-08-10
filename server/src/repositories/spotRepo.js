import pool, { query } from '../db.js';

/**
 * 金额四舍五入到分。
 * @param {unknown} amount - 原始金额
 * @returns {number}
 */
function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

/**
 * 将 spots 行映射为 API Spot 对象。
 * @param {Record<string, unknown>} row - 数据库行
 * @returns {{
 *   id: number,
 *   tripId: number,
 *   name: string,
 *   type: string,
 *   estimatedCost: number,
 *   status: string,
 *   createdAt: string
 * }}
 */
export function mapSpotRow(row) {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at);

  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    name: String(row.name),
    type: String(row.type),
    estimatedCost: roundMoney(row.estimated_cost),
    status: String(row.status),
    createdAt,
  };
}

/**
 * 列出某行程下的景点，按 created_at 升序。
 * @param {number} tripId - 行程 ID
 * @returns {Promise<ReturnType<typeof mapSpotRow>[]>}
 */
export async function listSpotsByTripId(tripId) {
  const result = await query(
    `SELECT id, trip_id, name, type, estimated_cost, status, created_at
     FROM spots
     WHERE trip_id = $1
     ORDER BY created_at ASC`,
    [tripId],
  );
  return result.rows.map(mapSpotRow);
}

/**
 * 按主键查询景点。
 * @param {number} id - 景点 ID
 * @returns {Promise<ReturnType<typeof mapSpotRow> | null>}
 */
export async function getSpotById(id) {
  const result = await query(
    `SELECT id, trip_id, name, type, estimated_cost, status, created_at
     FROM spots
     WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapSpotRow(result.rows[0]);
}

/**
 * 创建景点。
 * @param {number} tripId - 行程 ID
 * @param {{
 *   name: string,
 *   type: string,
 *   estimatedCost: number,
 *   status: string
 * }} data - 已校验字段
 * @returns {Promise<ReturnType<typeof mapSpotRow>>}
 */
export async function createSpot(tripId, data) {
  const result = await query(
    `INSERT INTO spots (trip_id, name, type, estimated_cost, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, trip_id, name, type, estimated_cost, status, created_at`,
    [tripId, data.name, data.type, roundMoney(data.estimatedCost), data.status],
  );
  return mapSpotRow(result.rows[0]);
}

/** PATCH 允许更新的 API 字段 → 白名单列名（禁止用请求体 key 直接拼 SQL） */
const SPOT_PATCH_COLUMNS = {
  name: 'name',
  type: 'type',
  estimatedCost: 'estimated_cost',
  status: 'status',
};

/**
 * 部分更新景点（仅更新传入字段）。
 * @param {number} id - 景点 ID
 * @param {Partial<{
 *   name: string,
 *   type: string,
 *   estimatedCost: number,
 *   status: string
 * }>} patch - 已校验的待更新字段
 * @returns {Promise<ReturnType<typeof mapSpotRow> | null>}
 */
export async function updateSpot(id, patch) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [apiKey, column] of Object.entries(SPOT_PATCH_COLUMNS)) {
    if (!Object.prototype.hasOwnProperty.call(patch, apiKey)) {
      continue;
    }
    setClauses.push(`${column} = $${idx}`);
    const value =
      apiKey === 'estimatedCost' ? roundMoney(patch[apiKey]) : patch[apiKey];
    values.push(value);
    idx += 1;
  }

  if (setClauses.length === 0) {
    return getSpotById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE spots
     SET ${setClauses.join(', ')}
     WHERE id = $${idx}
     RETURNING id, trip_id, name, type, estimated_cost, status, created_at`,
    values,
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapSpotRow(result.rows[0]);
}

/**
 * 删除景点。
 * @param {number} id - 景点 ID
 * @returns {Promise<boolean>} 是否删除到记录
 */
export async function deleteSpot(id) {
  const result = await query(
    `DELETE FROM spots
     WHERE id = $1
     RETURNING id`,
    [id],
  );
  return result.rows.length > 0;
}

/**
 * 事务批量创建景点；任一条失败则整批回滚。
 * @param {number} tripId - 行程 ID
 * @param {Array<{
 *   name: string,
 *   type: string,
 *   estimatedCost: number,
 *   status: string
 * }>} items - 已校验的清单项
 * @returns {Promise<ReturnType<typeof mapSpotRow>[]>}
 */
export async function createSpotsBulk(tripId, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const item of items) {
      const result = await client.query(
        `INSERT INTO spots (trip_id, name, type, estimated_cost, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, trip_id, name, type, estimated_cost, status, created_at`,
        [
          tripId,
          item.name,
          item.type,
          roundMoney(item.estimatedCost),
          item.status,
        ],
      );
      created.push(mapSpotRow(result.rows[0]));
    }
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
