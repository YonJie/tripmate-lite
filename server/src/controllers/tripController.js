import * as tripRepo from '../repositories/tripRepo.js';

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
 * @returns {number | null} 合法正整数，否则 null
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
 * 校验并规范化创建/更新行程请求体。
 * @param {unknown} body - 请求体
 * @returns {{
 *   name: string,
 *   destination: string,
 *   startDate: string,
 *   endDate: string,
 *   budget: number,
 *   note: string | null
 * }}
 */
function parseTripBody(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    throw createError('请求体必须为 JSON 对象', 400, 'VALIDATION_ERROR');
  }

  const { name, destination, startDate, endDate, budget, note } = body;

  if (typeof name !== 'string') {
    throw createError('行程名称必须为字符串', 400, 'VALIDATION_ERROR');
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 50) {
    throw createError('行程名称不能为空且长度须为 1–50', 400, 'VALIDATION_ERROR');
  }

  if (typeof destination !== 'string') {
    throw createError('目的地必须为字符串', 400, 'VALIDATION_ERROR');
  }
  const trimmedDestination = destination.trim();
  if (trimmedDestination.length < 1 || trimmedDestination.length > 50) {
    throw createError('目的地不能为空且长度须为 1–50', 400, 'VALIDATION_ERROR');
  }

  if (!isValidYmd(startDate)) {
    throw createError('开始日期必须为合法的 YYYY-MM-DD', 400, 'VALIDATION_ERROR');
  }
  if (!isValidYmd(endDate)) {
    throw createError('结束日期必须为合法的 YYYY-MM-DD', 400, 'VALIDATION_ERROR');
  }
  if (endDate < startDate) {
    throw createError('结束日期不能早于开始日期', 400, 'VALIDATION_ERROR');
  }

  if (typeof budget !== 'number' || !Number.isFinite(budget)) {
    throw createError('预算必须为数字', 400, 'VALIDATION_ERROR');
  }
  if (budget < 0) {
    throw createError('预算不能为负数', 400, 'VALIDATION_ERROR');
  }

  let normalizedNote = null;
  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      throw createError('备注必须为字符串', 400, 'VALIDATION_ERROR');
    }
    if (note.length > 500) {
      throw createError('备注长度不能超过 500', 400, 'VALIDATION_ERROR');
    }
    normalizedNote = note.trim() === '' ? null : note;
  }

  return {
    name: trimmedName,
    destination: trimmedDestination,
    startDate,
    endDate,
    budget: Math.round(budget * 100) / 100,
    note: normalizedNote,
  };
}

/**
 * GET /api/trips —— 行程列表（createdAt 倒序）。
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function listTrips(_req, res, next) {
  try {
    const trips = await tripRepo.listTrips();
    res.status(200).json(trips);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trips/:id —— 行程详情。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getTrip(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (id == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    const trip = await tripRepo.getTripById(id);
    if (!trip) {
      next(createError('行程不存在', 404, 'NOT_FOUND'));
      return;
    }
    res.status(200).json(trip);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips —— 创建行程。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function createTrip(req, res, next) {
  try {
    const data = parseTripBody(req.body);
    const trip = await tripRepo.createTrip(data);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/trips/:id —— 全量更新行程。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function updateTrip(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (id == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    const data = parseTripBody(req.body);
    const trip = await tripRepo.updateTrip(id, data);
    if (!trip) {
      next(createError('行程不存在', 404, 'NOT_FOUND'));
      return;
    }
    res.status(200).json(trip);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/trips/:id —— 删除行程（级联子表）。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function deleteTrip(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (id == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    const deleted = await tripRepo.deleteTrip(id);
    if (!deleted) {
      next(createError('行程不存在', 404, 'NOT_FOUND'));
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
