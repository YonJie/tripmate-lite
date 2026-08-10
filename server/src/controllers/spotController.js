import * as spotRepo from '../repositories/spotRepo.js';
import * as tripRepo from '../repositories/tripRepo.js';

const SPOT_TYPES = ['景点', '餐饮', '交通', '其他'];
const SPOT_STATUSES = ['待去', '已去'];

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
 * 校验并规范化单条景点创建字段。
 * @param {unknown} body - 请求体或 items 元素
 * @returns {{
 *   name: string,
 *   type: string,
 *   estimatedCost: number,
 *   status: string
 * }}
 */
function parseSpotCreateBody(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    throw createError('景点数据必须为 JSON 对象', 400, 'VALIDATION_ERROR');
  }

  const { name, type, estimatedCost, status } = body;

  if (typeof name !== 'string') {
    throw createError('景点名称必须为字符串', 400, 'VALIDATION_ERROR');
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 50) {
    throw createError('景点名称不能为空且长度须为 1–50', 400, 'VALIDATION_ERROR');
  }

  if (typeof type !== 'string' || !SPOT_TYPES.includes(type)) {
    throw createError('景点类型非法', 400, 'VALIDATION_ERROR');
  }

  let cost = 0;
  if (estimatedCost !== undefined) {
    if (typeof estimatedCost !== 'number' || !Number.isFinite(estimatedCost)) {
      throw createError('预估费用必须为数字', 400, 'VALIDATION_ERROR');
    }
    if (estimatedCost < 0) {
      throw createError('预估费用不能为负数', 400, 'VALIDATION_ERROR');
    }
    cost = Math.round(estimatedCost * 100) / 100;
  }

  let normalizedStatus = '待去';
  if (status !== undefined) {
    if (typeof status !== 'string' || !SPOT_STATUSES.includes(status)) {
      throw createError('景点状态非法', 400, 'VALIDATION_ERROR');
    }
    normalizedStatus = status;
  }

  return {
    name: trimmedName,
    type,
    estimatedCost: cost,
    status: normalizedStatus,
  };
}

/**
 * 校验并规范化 PATCH 请求体（全部可选，至少一项）。
 * @param {unknown} body - 请求体
 * @returns {Partial<{
 *   name: string,
 *   type: string,
 *   estimatedCost: number,
 *   status: string
 * }>}
 */
function parseSpotPatchBody(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    throw createError('请求体必须为 JSON 对象', 400, 'VALIDATION_ERROR');
  }

  /** @type {Partial<{ name: string, type: string, estimatedCost: number, status: string }>} */
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (typeof body.name !== 'string') {
      throw createError('景点名称必须为字符串', 400, 'VALIDATION_ERROR');
    }
    const trimmedName = body.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      throw createError('景点名称不能为空且长度须为 1–50', 400, 'VALIDATION_ERROR');
    }
    patch.name = trimmedName;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'type')) {
    if (typeof body.type !== 'string' || !SPOT_TYPES.includes(body.type)) {
      throw createError('景点类型非法', 400, 'VALIDATION_ERROR');
    }
    patch.type = body.type;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'estimatedCost')) {
    if (
      typeof body.estimatedCost !== 'number' ||
      !Number.isFinite(body.estimatedCost)
    ) {
      throw createError('预估费用必须为数字', 400, 'VALIDATION_ERROR');
    }
    if (body.estimatedCost < 0) {
      throw createError('预估费用不能为负数', 400, 'VALIDATION_ERROR');
    }
    patch.estimatedCost = Math.round(body.estimatedCost * 100) / 100;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (
      typeof body.status !== 'string' ||
      !SPOT_STATUSES.includes(body.status)
    ) {
      throw createError('景点状态非法', 400, 'VALIDATION_ERROR');
    }
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    throw createError('请求体至少需要一个可更新字段', 400, 'VALIDATION_ERROR');
  }

  return patch;
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
 * GET /api/trips/:tripId/spots
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function listSpots(req, res, next) {
  try {
    const tripId = parsePositiveInt(req.params.tripId);
    if (tripId == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    await assertTripExists(tripId);
    const spots = await spotRepo.listSpotsByTripId(tripId);
    res.status(200).json(spots);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips/:tripId/spots
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function createSpot(req, res, next) {
  try {
    const tripId = parsePositiveInt(req.params.tripId);
    if (tripId == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    await assertTripExists(tripId);
    const data = parseSpotCreateBody(req.body);
    const spot = await spotRepo.createSpot(tripId, data);
    res.status(201).json(spot);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips/:tripId/spots/bulk
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function bulkCreateSpots(req, res, next) {
  try {
    const tripId = parsePositiveInt(req.params.tripId);
    if (tripId == null) {
      next(createError('行程 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }

    const body = req.body;
    if (body == null || typeof body !== 'object' || Array.isArray(body)) {
      next(createError('请求体必须为 JSON 对象', 400, 'VALIDATION_ERROR'));
      return;
    }
    if (!Array.isArray(body.items)) {
      next(createError('items 必须为数组', 400, 'VALIDATION_ERROR'));
      return;
    }
    if (body.items.length < 1 || body.items.length > 50) {
      next(createError('items 长度须为 1–50', 400, 'VALIDATION_ERROR'));
      return;
    }

    const items = body.items.map((item) => parseSpotCreateBody(item));
    await assertTripExists(tripId);
    const created = await spotRepo.createSpotsBulk(tripId, items);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/spots/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function patchSpot(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (id == null) {
      next(createError('景点 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    const patch = parseSpotPatchBody(req.body);
    const spot = await spotRepo.updateSpot(id, patch);
    if (!spot) {
      next(createError('景点不存在', 404, 'NOT_FOUND'));
      return;
    }
    res.status(200).json(spot);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/spots/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function deleteSpot(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (id == null) {
      next(createError('景点 ID 必须为正整数', 400, 'VALIDATION_ERROR'));
      return;
    }
    const deleted = await spotRepo.deleteSpot(id);
    if (!deleted) {
      next(createError('景点不存在', 404, 'NOT_FOUND'));
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
