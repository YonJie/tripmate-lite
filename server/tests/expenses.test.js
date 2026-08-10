import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

/**
 * 费用汇总（评审重点抽检：NUMERIC→number、超支、删后回退）。
 */
describe('费用汇总 summary', () => {
  /**
   * @param {number} budget
   * @returns {Promise<number>}
   */
  async function createTrip(budget) {
    const res = await request(app)
      .post('/api/trips')
      .send({
        name: '费用汇总测试',
        destination: '杭州',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        budget,
      })
      .expect(201);
    return res.body.id;
  }

  it('三条费用合计正确且为 number；超支与删除回退', async () => {
    const tripId = await createTrip(1000);

    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '高铁',
        amount: 300,
        category: '交通',
        spendDate: '2026-10-01',
      })
      .expect(201);

    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '午餐',
        amount: 200,
        category: '餐饮',
        spendDate: '2026-10-01',
      })
      .expect(201);

    const hotel = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '酒店',
        amount: 400,
        category: '住宿',
        spendDate: '2026-10-02',
      })
      .expect(201);

    const summary = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);

    expect(summary.body.totalSpent).toBe(900);
    expect(typeof summary.body.totalSpent).toBe('number');
    expect(summary.body.remaining).toBe(100);
    expect(typeof summary.body.remaining).toBe('number');
    expect(summary.body.overBudget).toBe(false);
    expect(summary.body.byCategory).toHaveLength(3);
    expect(summary.body.byCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: '交通', amount: 300, count: 1 }),
        expect.objectContaining({ category: '餐饮', amount: 200, count: 1 }),
        expect.objectContaining({ category: '住宿', amount: 400, count: 1 }),
      ]),
    );
    for (const row of summary.body.byCategory) {
      expect(typeof row.amount).toBe('number');
      expect(typeof row.count).toBe('number');
    }

    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '购物',
        amount: 500,
        category: '其他',
        spendDate: '2026-10-03',
      })
      .expect(201);

    const over = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);
    expect(over.body.totalSpent).toBe(1400);
    expect(typeof over.body.totalSpent).toBe('number');
    expect(over.body.remaining).toBe(-400);
    expect(over.body.overBudget).toBe(true);

    await request(app).delete(`/api/expenses/${hotel.body.id}`).expect(204);

    const afterDelete = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);
    // 1400 - 400(住宿) = 1000
    expect(afterDelete.body.totalSpent).toBe(1000);
    expect(afterDelete.body.remaining).toBe(0);
    expect(afterDelete.body.overBudget).toBe(false);
  });

  it('无费用行程 summary：totalSpent 为 0、byCategory 为空数组', async () => {
    const tripId = await createTrip(1000);

    const summary = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);

    expect(summary.body.totalSpent).toBe(0);
    expect(typeof summary.body.totalSpent).toBe('number');
    expect(summary.body.remaining).toBe(1000);
    expect(summary.body.overBudget).toBe(false);
    expect(summary.body.byCategory).toEqual([]);
  });
});
