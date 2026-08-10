import { defineConfig } from 'vitest/config';

/**
 * Vitest 配置：串行文件执行，避免并行抢同一测试库。
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    pool: 'forks',
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
