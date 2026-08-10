import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import pool from '../src/db.js';

/**
 * 景点状态流转与行程级联删除。
 */
describe('景点与级联删除', () => {
  /**
   * @returns {Promise<number>}
   */
  async function createTrip() {
    const res = await request(app)
      .post('/api/trips')
      .send({
        name: '景点级联测试',
        destination: '成都',
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        budget: 3500,
      })
      .expect(201);
    return res.body.id;
  }

  it('新增 2 个景点；PATCH 已去后持久化；非法 type 返回 400', async () => {
    const tripId = await createTrip();

    const spotA = await request(app)
      .post(`/api/trips/${tripId}/spots`)
      .send({ name: '宽窄巷子', type: '景点' })
      .expect(201);
    expect(spotA.body.status).toBe('待去');

    await request(app)
      .post(`/api/trips/${tripId}/spots`)
      .send({ name: '都江堰', type: '景点' })
      .expect(201);

    const list = await request(app)
      .get(`/api/trips/${tripId}/spots`)
      .expect(200);
    expect(list.body).toHaveLength(2);

    await request(app)
      .patch(`/api/spots/${spotA.body.id}`)
      .send({ status: '已去' })
      .expect(200);

    const again = await request(app)
      .get(`/api/trips/${tripId}/spots`)
      .expect(200);
    const updated = again.body.find((s) => s.id === spotA.body.id);
    expect(updated).toBeDefined();
    expect(updated.status).toBe('已去');

    const bad = await request(app)
      .post(`/api/trips/${tripId}/spots`)
      .send({ name: '非法类型', type: '无效类型' })
      .expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('删除行程后 spots 与 expenses 全部级联删除（直查库行数为 0）', async () => {
    const tripId = await createTrip();

    await request(app)
      .post(`/api/trips/${tripId}/spots`)
      .send({ name: '宽窄巷子', type: '景点' })
      .expect(201);

    await request(app)
      .post(`/api/trips/${tripId}/spots`)
      .send({ name: '都江堰', type: '景点' })
      .expect(201);

    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '高铁票',
        amount: 620,
        category: '交通',
        spendDate: '2026-09-01',
      })
      .expect(201);

    await request(app).delete(`/api/trips/${tripId}`).expect(204);

    const spots = await pool.query(
      'SELECT COUNT(*)::int AS count FROM spots WHERE trip_id = $1',
      [tripId],
    );
    const expenses = await pool.query(
      'SELECT COUNT(*)::int AS count FROM expenses WHERE trip_id = $1',
      [tripId],
    );

    expect(spots.rows[0].count).toBe(0);
    expect(expenses.rows[0].count).toBe(0);
  });
});
