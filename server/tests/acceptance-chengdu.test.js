import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { clearData, closePool, initSchema } from './helpers.js';

/**
 * 验收主路径（成都三日游）：对齐演示脚本与 PRD §7 行程/景点/费用闭环。
 * UI 文案与进度条样式见根目录 TESTING.md 手测清单。
 */
describe('验收主路径 · 成都三日游', () => {
  beforeAll(async () => {
    await initSchema();
  });

  afterEach(async () => {
    await clearData();
  });

  afterAll(async () => {
    await closePool();
  });

  it('步骤1–5：行程 CRUD → 景点持久化 → 费用汇总/超支 → 级联删除', async () => {
    // —— 1. 新建「成都三日游」→ 列表可见 → 改预算 3500 → 再读仍是 3500 ——
    const createTripRes = await request(app)
      .post('/api/trips')
      .send({
        name: '成都三日游',
        destination: '成都',
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        budget: 3000,
        note: '验收主路径',
      })
      .expect(201);

    const tripId = createTripRes.body.id;
    expect(tripId).toEqual(expect.any(Number));
    expect(createTripRes.body.name).toBe('成都三日游');
    expect(createTripRes.body.budget).toBe(3000);

    const listAfterCreate = await request(app).get('/api/trips').expect(200);
    expect(listAfterCreate.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: tripId, name: '成都三日游', budget: 3000 }),
      ]),
    );

    const updateRes = await request(app)
      .put(`/api/trips/${tripId}`)
      .send({
        name: '成都三日游',
        destination: '成都',
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        budget: 3500,
        note: '验收主路径',
      })
      .expect(200);

    expect(updateRes.body.budget).toBe(3500);

    const getAfterUpdate = await request(app)
      .get(`/api/trips/${tripId}`)
      .expect(200);
    expect(getAfterUpdate.body.budget).toBe(3500);

    // —— 2. 新增景点 → 「宽窄巷子」改为已去 → 再读仍是已去 ——
    const spotKuanzhai = await request(app)
      .post(`/api/trips/${tripId}/spots`)
      .send({ name: '宽窄巷子', type: '景点' })
      .expect(201);
    expect(spotKuanzhai.body.status).toBe('待去');

    const spotDujiangyan = await request(app)
      .post(`/api/trips/${tripId}/spots`)
      .send({ name: '都江堰', type: '景点' })
      .expect(201);
    expect(spotDujiangyan.body.name).toBe('都江堰');

    const spotsAfterCreate = await request(app)
      .get(`/api/trips/${tripId}/spots`)
      .expect(200);
    expect(spotsAfterCreate.body).toHaveLength(2);
    expect(spotsAfterCreate.body.map((s) => s.name)).toEqual([
      '宽窄巷子',
      '都江堰',
    ]);

    await request(app)
      .patch(`/api/spots/${spotKuanzhai.body.id}`)
      .send({ status: '已去' })
      .expect(200);

    const spotsAfterPatch = await request(app)
      .get(`/api/trips/${tripId}/spots`)
      .expect(200);
    const kuanzhai = spotsAfterPatch.body.find((s) => s.name === '宽窄巷子');
    expect(kuanzhai).toBeDefined();
    expect(kuanzhai.status).toBe('已去');

    // —— 3. 两笔费用 → 合计 1520；剩余 1980 ——
    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '高铁票',
        amount: 620,
        category: '交通',
        spendDate: '2026-09-01',
      })
      .expect(201);

    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '民宿',
        amount: 900,
        category: '住宿',
        spendDate: '2026-09-01',
      })
      .expect(201);

    const summaryOk = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);

    expect(summaryOk.body).toMatchObject({
      tripId,
      budget: 3500,
      totalSpent: 1520,
      remaining: 1980,
      overBudget: false,
    });
    expect(typeof summaryOk.body.totalSpent).toBe('number');
    expect(typeof summaryOk.body.remaining).toBe('number');

    // —— 4. 再加购物 2500 → 合计 4020 → 超支 ——
    await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .send({
        name: '购物',
        amount: 2500,
        category: '其他',
        spendDate: '2026-09-02',
      })
      .expect(201);

    const summaryOver = await request(app)
      .get(`/api/trips/${tripId}/summary`)
      .expect(200);

    expect(summaryOver.body).toMatchObject({
      tripId,
      budget: 3500,
      totalSpent: 4020,
      remaining: -520,
      overBudget: true,
    });
    expect(summaryOver.body.usageRate).toBeGreaterThan(1);

    // —— 5. 删除行程 → 列表空；景点/费用级联消失且不报错 ——
    await request(app).delete(`/api/trips/${tripId}`).expect(204);

    const listAfterDelete = await request(app).get('/api/trips').expect(200);
    expect(listAfterDelete.body).toEqual([]);

    await request(app).get(`/api/trips/${tripId}`).expect(404);
    await request(app).get(`/api/trips/${tripId}/spots`).expect(404);
    await request(app).get(`/api/trips/${tripId}/expenses`).expect(404);
    await request(app).get(`/api/trips/${tripId}/summary`).expect(404);
  });
});
