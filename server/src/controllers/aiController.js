import * as tripRepo from '../repositories/tripRepo.js';
import { buildMockSuggestData } from '../ai/buildMock.js';
import { callDeepseekSuggest } from '../ai/deepseekClient.js';
import { validateSuggestData } from '../ai/validateSuggestData.js';

/**
 * 构造带 status / code 的业务错误。
 * @param {string} message
 * @param {number} status
 * @param {string} code
 * @returns {Error & { status: number, code: string }}
 */
function createError(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}

/**
 * 解析为正整数；非法返回 null。
 * @param {unknown} raw
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
 * 计算含首尾的行程天数。
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
function calcTripDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

/**
 * 判断请求体是否显式提供了某字段（存在且非 null）。
 * @param {Record<string, unknown>} body
 * @param {string} key
 * @returns {boolean}
 */
function hasExplicit(body, key) {
  return Object.prototype.hasOwnProperty.call(body, key) && body[key] !== null;
}

/**
 * 按契约补齐 destination / days / budget。
 * @param {unknown} body
 * @returns {Promise<{ destination: string, days: number, budget: number }>}
 */
async function resolveSuggestInput(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    throw createError('请求体必须为 JSON 对象', 400, 'VALIDATION_ERROR');
  }

  /** @type {Record<string, unknown>} */
  const req = body;

  let destination;
  let days;
  let budget;

  if (hasExplicit(req, 'destination')) {
    if (typeof req.destination !== 'string') {
      throw createError('destination 必须为字符串', 400, 'VALIDATION_ERROR');
    }
    destination = req.destination.trim();
  }

  if (hasExplicit(req, 'days')) {
    if (typeof req.days !== 'number' || !Number.isInteger(req.days)) {
      throw createError('days 必须为整数', 400, 'VALIDATION_ERROR');
    }
    days = req.days;
  }

  if (hasExplicit(req, 'budget')) {
    if (typeof req.budget !== 'number' || !Number.isFinite(req.budget) || req.budget < 0) {
      throw createError('budget 必须为 >= 0 的 number', 400, 'VALIDATION_ERROR');
    }
    budget = Math.round(req.budget * 100) / 100;
  }

  if (hasExplicit(req, 'tripId')) {
    const tripId = parsePositiveInt(req.tripId);
    if (tripId == null) {
      throw createError('tripId 必须为正整数', 400, 'VALIDATION_ERROR');
    }
    const trip = await tripRepo.getTripById(tripId);
    if (!trip) {
      throw createError('行程不存在', 404, 'NOT_FOUND');
    }
    if (destination === undefined) {
      destination = trip.destination;
    }
    if (budget === undefined) {
      budget = trip.budget;
    }
    if (days === undefined) {
      days = calcTripDays(trip.startDate, trip.endDate);
    }
  }

  if (destination === undefined || days === undefined || budget === undefined) {
    throw createError(
      '请提供 destination、days、budget，或提供可补齐字段的 tripId',
      400,
      'VALIDATION_ERROR',
    );
  }

  if (destination.length < 1 || destination.length > 50) {
    throw createError('destination 长度须为 1–50', 400, 'VALIDATION_ERROR');
  }

  if (!Number.isInteger(days) || days < 1 || days > 15) {
    throw createError('days 须为 1–15 的整数', 400, 'VALIDATION_ERROR');
  }

  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0) {
    throw createError('budget 必须为 >= 0 的 number', 400, 'VALIDATION_ERROR');
  }

  return { destination, days, budget };
}

/**
 * POST /api/ai/suggest —— 真调优先，失败一律 200 + Mock。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function suggest(req, res, next) {
  try {
    const input = await resolveSuggestInput(req.body);
    const generatedAt = new Date().toISOString();

    const deepseek = await callDeepseekSuggest(input);
    if (deepseek.ok) {
      res.status(200).json({
        source: 'deepseek',
        fallbackReason: null,
        generatedAt,
        input,
        data: deepseek.data,
      });
      return;
    }

    const mockData = buildMockSuggestData(input);
    const check = validateSuggestData(mockData);
    if (!check.ok) {
      // Mock 自身不合格时仍不得 5xx：返回最小可用结构
      res.status(200).json({
        source: 'mock',
        fallbackReason: deepseek.reason,
        generatedAt,
        input,
        data: mockData,
      });
      return;
    }

    res.status(200).json({
      source: 'mock',
      fallbackReason: deepseek.reason,
      generatedAt,
      input,
      data: mockData,
    });
  } catch (err) {
    next(err);
  }
}
