import * as expenseRepo from '../repositories/expenseRepo.js';
import * as tripRepo from '../repositories/tripRepo.js';

const EXPENSE_CATEGORIES = ['交通', '住宿', '餐饮', '门票', '其他'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 构造带 status / code 的业务错误。
 * @param {string} message - 中文提示
 * @param {number} status - HTTP 状态码
 * @param {string} code - 契约错误码
 * @returns {Error & { status: number, code: string }}
 */
function createError(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}

/**
 * 解析路径参数为正整数 ID。
 * @param {unknown} raw - 路径参数原始值
 * @returns {number | null}
 */
function parsePositiveInt(raw) {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return null;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

/**
 * 校验 YYYY-MM-DD 且为真实日历日。
 * @param {unknown} value - 待校验日期
 * @returns {boolean}
 */
function isValidYmd(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * 校验并规范化创建费用请求体。
 * @param {unknown} body - 请求体
 * @returns {{
 *   name: string,
 *   amount: number,
 *   category: string,
 *   spendDate: string
 * }}
 */
function parseExpenseBody(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    throw createError('请求体必须为 JSON 对象', 400, 'VALIDATION_ERROR');
  }

  const { name, amount, category, spendDate } = body;

  if (typeof name !== 'string') {
    throw createError('费用名称必须为字符串', 400, 'VALIDATION_ERROR');
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 50) {
    throw createError('费用名称不能为空且长度须为 1–50', 400, 'VALIDATION_ERROR');
  }

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw createError('金额必须为数字', 400, 'VALIDATION_ERROR');
  }
  if (amount < 0) {
    throw createError('金额不能为负数', 400, 'VALIDATION_ERROR');
  }

  if (typeof category !== 'string' || !EXPENSE_CATEGORIES.includes(category)) {
    throw createError('费用分类非法', 400, 'VALIDATION_ERROR');
  }

  if (!isValidYmd(spendDate)) {
    throw createError('消费日期必须为合法的 YYYY-MM-DD', 400, 'VALIDATION_ERROR');
  }

  return {
    name: trimmedName,
    amount: Math.round(amount * 100) / 100,
    category,
    spendDate,
  };
}

/**
 * 确认行程存在。
 * @param {number} tripId - 行程 ID
 * @returns {Promise<void>}
 */
async function assertTripExists(tripId) {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip) {
    throw createError('行程不存在', 404, 'NOT_FOUND');
  }
}

/**
 * GET /api/trips/:tripId/expenses
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function listExpenses(req, res, next) {
  try {
    const tripId = parsePositiveInt(req.params.tripId);
    if (tripId == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    await assertTripExists(tripId);
    const expenses = await expenseRepo.listExpensesByTripId(tripId);
    res.status(200).json(expenses);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips/:tripId/expenses
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function createExpense(req, res, next) {
  try {
    const tripId = parsePositiveInt(req.params.tripId);
    if (tripId == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    await assertTripExists(tripId);
    const data = parseExpenseBody(req.body);
    const expense = await expenseRepo.createExpense(tripId, data);
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/expenses/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function deleteExpense(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (id == null) {
      next(createError('费用 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    const deleted = await expenseRepo.deleteExpense(id);
    if (!deleted) {
      next(createError('费用不存在', 404, 'NOT_FOUND'));
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trips/:tripId/summary
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getSummary(req, res, next) {
  try {
    const tripId = parsePositiveInt(req.params.tripId);
    if (tripId == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    const summary = await expenseRepo.getTripSummary(tripId);
    if (!summary) {
      next(createError('行程不存在', 404, 'NOT_FOUND'));
      return;
    }
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}
