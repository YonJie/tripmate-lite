import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { clearData, closePool, initSchema } from './helpers.js';

/**
 * 费用汇总金额计算正确性（契约 §4.4；防 NUMERIC 字符串拼接）。
 */
describe('费用汇总 summary', () => {
  /** @type {number} */
  let tripId;

  beforeAll(async () => {
    await initSchema();
  });

  afterEach(async () => {
    await clearData();
  });

  afterAll(async () => {
    await closePool();
  });

  /**
   * @returns {Promise<number>}
   */
  async function createTripWithBudget(budget) {
    const res = await request(app)
      .post('/api/trips')
      .send({
        name: '汇总测试行程',
        destination: '杭州',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        budget,
      })
      .expect(201);
    return res.body.id;
  }

  it('两笔费用合计为 number 相加；删除后同步更新', async () => {
    tripId = await createTripWithBudget(1000);

    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '门票A',
        amount: 130.5,
        category: '门票',
        spendDate: '2026-10-01',
      })
      .expect(201);

    const expB = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '高铁',
        amount: 560.25,
        category: '交通',
        spendDate: '2026-10-01',
      })
      .expect(201);

    const summary = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);

    expect(summary.body.totalSpent).toBe(690.75);
    expect(summary.body.remaining).toBe(309.25);
    expect(summary.body.overBudget).toBe(false);
    expect(typeof summary.body.totalSpent).toBe('number');
    expect(summary.body.byCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: '交通', amount: 560.25, count: 1 }),
        expect.objectContaining({ category: '门票', amount: 130.5, count: 1 }),
      ]),
    );

    await request(app).delete(`/api/expenses/${expB.body.id}`).expect(204);

    const afterDelete = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);
    expect(afterDelete.body.totalSpent).toBe(130.5);
    expect(afterDelete.body.remaining).toBe(869.5);
  });

  it('超支时 overBudget=true 且 remaining 为负', async () => {
    tripId = await createTripWithBudget(500);

    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '大餐',
        amount: 690,
        category: '餐饮',
        spendDate: '2026-10-01',
      })
      .expect(201);

    const summary = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);

    expect(summary.body).toMatchObject({
      budget: 500,
      totalSpent: 690,
      remaining: -190,
      overBudget: true,
      usageRate: 1.38,
    });
  });
});
