import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { clearData, closePool, initSchema } from './helpers.js';

/**
 * AI 建议在强制失败场景须仍返回 200 且 source=mock（契约 §5.1）。
 * 通过清空 DEEPSEEK_API_KEY 触发 Mock 降级。
 */
describe('AI suggest Mock 降级', () => {
  /** @type {string | undefined} */
  let originalKey;

  beforeAll(async () => {
    await initSchema();
    originalKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = '';
  });

  afterEach(async () => {
    await clearData();
  });

  afterAll(async () => {
    if (originalKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }
    await closePool();
  });

  it('强制无 Key 时仍 200 且 source 为 mock', async () => {
    const res = await request(app)
      .post('/api/ai/suggest')
      .send({
        destination: '成都',
        days: 3,
        budget: 3500,
      });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('mock');
    expect(res.body.fallbackReason == null || typeof res.body.fallbackReason === 'string').toBe(
      true,
    );
    expect(res.body.input).toMatchObject({
      destination: '成都',
      days: 3,
      budget: 3500,
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        summary: expect.any(String),
        days: expect.any(Array),
        budgetPlan: expect.any(Array),
        tips: expect.any(Array),
      }),
    );
    expect(res.body.data.tips.length).toBeGreaterThanOrEqual(3);
  });
});
