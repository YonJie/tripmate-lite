import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { clearData, closePool, initSchema } from './helpers.js';

/**
 * 行程 CRUD 全链路（契约 §2）。
 */
describe('行程 CRUD', () => {
  beforeAll(async () => {
    await initSchema();
  });

  afterEach(async () => {
    await clearData();
  });

  afterAll(async () => {
    await closePool();
  });

  it('创建 → 列表 → 详情 → 更新 → 删除', async () => {
    const created = await request(app)
      .post('/api/trips')
      .send({
        name: '周末青岛两日游',
        destination: '青岛',
        startDate: '2026-08-16',
        endDate: '2026-08-17',
        budget: 1500,
        note: '海鲜别吃太多',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      name: '周末青岛两日游',
      destination: '青岛',
      startDate: '2026-08-16',
      endDate: '2026-08-17',
      budget: 1500,
      note: '海鲜别吃太多',
    });
    expect(created.body.id).toEqual(expect.any(Number));
    expect(created.body.createdAt).toEqual(expect.any(String));

    const list = await request(app).get('/api/trips').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);

    const detail = await request(app)
      .get(`/api/trips/${created.body.id}`)
      .expect(200);
    expect(detail.body.name).toBe('周末青岛两日游');

    const updated = await request(app)
      .put(`/api/trips/${created.body.id}`)
      .send({
        name: '青岛海滨两日游',
        destination: '青岛',
        startDate: '2026-08-16',
        endDate: '2026-08-17',
        budget: 1800,
        note: null,
      })
      .expect(200);

    expect(updated.body).toMatchObject({
      id: created.body.id,
      name: '青岛海滨两日游',
      budget: 1800,
      note: null,
      createdAt: created.body.createdAt,
    });

    await request(app).delete(`/api/trips/${created.body.id}`).expect(204);
    await request(app).get(`/api/trips/${created.body.id}`).expect(404);
    const empty = await request(app).get('/api/trips').expect(200);
    expect(empty.body).toEqual([]);
  });

  it('校验失败返回 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/trips')
      .send({
        name: '',
        destination: '青岛',
        startDate: '2026-08-17',
        endDate: '2026-08-16',
        budget: -1,
      })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
