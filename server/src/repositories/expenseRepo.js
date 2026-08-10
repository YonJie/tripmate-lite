import { query } from '../db.js';

/**
 * 金额四舍五入到分。
 * @param {unknown} amount - 原始金额
 * @returns {number}
 */
function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

/**
 * 将 pg DATE / Date / 字符串格式化为 YYYY-MM-DD。
 * @param {Date | string | null | undefined} value - 原始日期
 * @returns {string | null}
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
 * 将 expenses 行映射为 API Expense 对象。
 * @param {Record<string, unknown>} row - 数据库行
 * @returns {{
 *   id: number,
 *   tripId: number,
 *   name: string,
 *   amount: number,
 *   category: string,
 *   spendDate: string,
 *   createdAt: string
 * }}
 */
export function mapExpenseRow(row) {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at);

  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    name: String(row.name),
    amount: roundMoney(row.amount),
    category: String(row.category),
    spendDate: formatDateOnly(row.spend_date),
    createdAt,
  };
}

/**
 * 列出某行程费用：spend_date 倒序，同日再按 created_at 倒序。
 * @param {number} tripId - 行程 ID
 * @returns {Promise<ReturnType<typeof mapExpenseRow>[]>}
 */
export async function listExpensesByTripId(tripId) {
  const result = await query(
    `SELECT id, trip_id, name, amount, category, spend_date, created_at
     FROM expenses
     WHERE trip_id = $1
     ORDER BY spend_date DESC, created_at DESC`,
    [tripId],
  );
  return result.rows.map(mapExpenseRow);
}

/**
 * 创建费用。
 * @param {number} tripId - 行程 ID
 * @param {{
 *   name: string,
 *   amount: number,
 *   category: string,
 *   spendDate: string
 * }} data - 已校验字段
 * @returns {Promise<ReturnType<typeof mapExpenseRow>>}
 */
export async function createExpense(tripId, data) {
  const result = await query(
    `INSERT INTO expenses (trip_id, name, amount, category, spend_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, trip_id, name, amount, category, spend_date, created_at`,
    [
      tripId,
      data.name,
      roundMoney(data.amount),
      data.category,
      data.spendDate,
    ],
  );
  return mapExpenseRow(result.rows[0]);
}

/**
 * 删除费用。
 * @param {number} id - 费用 ID
 * @returns {Promise<boolean>} 是否删除到记录
 */
export async function deleteExpense(id) {
  const result = await query(
    `DELETE FROM expenses
     WHERE id = $1
     RETURNING id`,
    [id],
  );
  return result.rows.length > 0;
}

/**
 * 查询行程预算汇总（分类 SUM + trip.budget）。
 * @param {number} tripId - 行程 ID
 * @returns {Promise<{
 *   tripId: number,
 *   budget: number,
 *   totalSpent: number,
 *   remaining: number,
 *   overBudget: boolean,
 *   usageRate: number,
 *   byCategory: Array<{ category: string, amount: number, count: number }>
 * } | null>} 行程不存在时返回 null
 */
export async function getTripSummary(tripId) {
  const tripResult = await query(
    `SELECT id, budget
     FROM trips
     WHERE id = $1`,
    [tripId],
  );
  if (tripResult.rows.length === 0) {
    return null;
  }

  const budget = roundMoney(tripResult.rows[0].budget);

  const categoryResult = await query(
    `SELECT category, SUM(amount) AS amount, COUNT(*) AS count
     FROM expenses
     WHERE trip_id = $1
     GROUP BY category`,
    [tripId],
  );

  const byCategory = categoryResult.rows
    .map((row) => ({
      category: String(row.category),
      amount: roundMoney(row.amount),
      count: parseInt(row.count, 10),
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalSpent = roundMoney(
    byCategory.reduce((sum, item) => sum + item.amount, 0),
  );
  const remaining = roundMoney(budget - totalSpent);
  const overBudget = totalSpent > budget;

  let usageRate = 0;
  if (budget > 0) {
    usageRate = Math.round((totalSpent / budget) * 100) / 100;
  } else if (totalSpent === 0) {
    usageRate = 0;
  } else {
    usageRate = 1;
  }

  return {
    tripId: Number(tripId),
    budget,
    totalSpent,
    remaining,
    overBudget,
    usageRate,
    byCategory,
  };
}
