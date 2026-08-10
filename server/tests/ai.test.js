import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

/**
 * AI 降级路径：无 Key 时必须 200 + mock，且内容与入参相关。
 */
describe('AI suggest Mock 降级', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('移除 DEEPSEEK_API_KEY 后仍 200 且 source=mock，内容与入参相关', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');

    const destination = '成都';
    const days = 3;
    const res = await request(app)
      .post('/api/ai/suggest')
      .send({
        destination,
        days,
        budget: 3500,
      });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('mock');
    expect(typeof res.body.fallbackReason).toBe('string');
    expect(res.body.fallbackReason.length).toBeGreaterThan(0);
    expect(res.body.data.days).toHaveLength(days);
    expect(res.body.data.tips.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.days[0].title).toContain(destination);
  });

  it('days 为 0 时返回 400', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');

    const res = await request(app)
      .post('/api/ai/suggest')
      .send({
        destination: '成都',
        days: 0,
        budget: 3500,
      })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('days 为 20 时返回 400', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');

    const res = await request(app)
      .post('/api/ai/suggest')
      .send({
        destination: '成都',
        days: 20,
        budget: 3500,
      })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
