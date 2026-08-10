import './env.js';
import pg from 'pg';

const { Pool, types } = pg;

/**
 * 将 PostgreSQL NUMERIC（OID 1700）解析为 JavaScript number。
 * 默认 pg 会把 NUMERIC 当作 string 返回，直接参与前端金额运算容易出错。
 */
types.setTypeParser(1700, parseFloat);

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL 未配置：请检查项目根目录 .env（须在依赖 db 的模块加载前生效）',
  );
}

/**
 * 基于 DATABASE_URL 的连接池。
 * 注意：须先 import './env.js'，否则 ESM 提升会导致连接串为 undefined，
 * 进而出现 SASL “client password must be a string”。
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * 执行 SQL 查询。
 * @param {string} text - SQL 文本
 * @param {unknown[]} [params] - 查询参数
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  return pool.query(text, params);
}

export default pool;
