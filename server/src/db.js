import pg from 'pg';

const { Pool, types } = pg;

/**
 * 将 PostgreSQL NUMERIC（OID 1700）解析为 JavaScript number。
 * 默认 pg 会把 NUMERIC 当作 string 返回，直接参与前端金额运算容易出错。
 */
types.setTypeParser(1700, parseFloat);

/**
 * 基于 DATABASE_URL 的连接池。
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
