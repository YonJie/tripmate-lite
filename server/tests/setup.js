/**
 * 在加载业务模块前固定测试环境，确保 db.js 选用 TEST_DATABASE_URL。
 * （vitest.config.js 的 test.env 亦会注入；此处双保险）
 */
process.env.NODE_ENV = 'test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll } from 'vitest';
import pool from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../db/schema.sql');

/**
 * 在独立测试库执行 schema.sql，建好表结构（可重复执行）。
 */
beforeAll(async () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
});

/**
 * 每个用例后清空业务表，保证互相独立。
 */
afterEach(async () => {
  await pool.query(
    'TRUNCATE TABLE expenses, spots, trips RESTART IDENTITY CASCADE',
  );
});

/**
 * 关闭连接池，避免 Vitest 进程挂起。
 */
afterAll(async () => {
  await pool.end();
});
