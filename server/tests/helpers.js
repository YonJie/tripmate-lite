import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../db/schema.sql');

/**
 * 用 schema.sql 初始化测试库表结构（可重复执行）。
 * @returns {Promise<void>}
 */
export async function initSchema() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

/**
 * 清空业务表数据，保留表结构；用例之间相互独立。
 * @returns {Promise<void>}
 */
export async function clearData() {
  await pool.query('TRUNCATE TABLE expenses, spots, trips RESTART IDENTITY CASCADE');
}

/**
 * 关闭连接池，便于进程干净退出。
 * @returns {Promise<void>}
 */
export async function closePool() {
  await pool.end();
}
