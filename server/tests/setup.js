/**
 * 在加载业务模块前固定测试环境，确保 db.js 选用 TEST_DATABASE_URL。
 */
process.env.NODE_ENV = 'test';
