import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

/**
 * 行程 CRUD 全链路（契约 §2）。
 */
describe('行程 CRUD', () => {
  const baseTrip = {
    name: '周末青岛两日游',
    destination: '青岛',
    startDate: '2026-08-16',
    endDate: '2026-08-17',
    budget: 1500,
    note: '海鲜别吃太多',
  };

  it('创建行程返回 201 且字段与请求一致；startDate 无时区偏移', async () => {
    const res = await request(app).post('/api/trips').send(baseTrip).expect(201);

    expect(res.body).toMatchObject({
      name: baseTrip.name,
      destination: baseTrip.destination,
      startDate: '2026-08-16',
      endDate: '2026-08-17',
      budget: 1500,
      note: baseTrip.note,
    });
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.createdAt).toEqual(expect.any(String));
    // 专门防 DATE 时区偏移：必须严格等于请求原值
    expect(res.body.startDate).toBe('2026-08-16');
    expect(res.body.endDate).toBe('2026-08-17');
  });

  it('创建后列表能查到', async () => {
    const created = await request(app).post('/api/trips').send(baseTrip).expect(201);

    const list = await request(app).get('/api/trips').expect(200);
    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          name: '周末青岛两日游',
          startDate: '2026-08-16',
        }),
      ]),
    );
  });

  it('更新行程后再查询，字段已变更', async () => {
    const created = await request(app).post('/api/trips').send(baseTrip).expect(201);

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
      startDate: '2026-08-16',
    });

    const detail = await request(app)
      .get(`/api/trips/${created.body.id}`)
      .expect(200);
    expect(detail.body.name).toBe('青岛海滨两日游');
    expect(detail.body.budget).toBe(1800);
    expect(detail.body.startDate).toBe('2026-08-16');
  });

  it('删除行程返回 204，再查返回 404', async () => {
    const created = await request(app).post('/api/trips').send(baseTrip).expect(201);

    await request(app).delete(`/api/trips/${created.body.id}`).expect(204);
    await request(app).get(`/api/trips/${created.body.id}`).expect(404);
  });

  it('空名称返回 400 且 code 为 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/trips')
      .send({ ...baseTrip, name: '' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('endDate 早于 startDate 返回 400', async () => {
    const res = await request(app)
      .post('/api/trips')
      .send({
        ...baseTrip,
        startDate: '2026-08-17',
        endDate: '2026-08-16',
      })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('负数预算返回 400', async () => {
    const res = await request(app)
      .post('/api/trips')
      .send({ ...baseTrip, budget: -1 })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('查询不存在的 id 返回 404', async () => {
    const res = await request(app).get('/api/trips/999999').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
