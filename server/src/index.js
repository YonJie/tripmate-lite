import './env.js';
import express from 'express';
import tripRoutes from './routes/trips.js';
import spotRoutes, { tripSpotRoutes } from './routes/spots.js';
import expenseRoutes, {
  tripExpenseRoutes,
  tripSummaryRoutes,
} from './routes/expenses.js';
import aiRoutes from './routes/ai.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

/**
 * 健康检查。
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// 先挂载更具体的嵌套路径，再挂载 /api/trips 的 :id，避免固定段被误判
app.use('/api/trips/:tripId/spots', tripSpotRoutes);
app.use('/api/trips/:tripId/expenses', tripExpenseRoutes);
app.use('/api/trips/:tripId/summary', tripSummaryRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ai', aiRoutes);

/**
 * 404 兜底。
 */
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '接口不存在',
    },
  });
});

/**
 * 全局错误处理。
 * @param {Error & { status?: number, code?: string }} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '服务器内部错误',
    },
  });
});

/**
 * 导出 app 供 Vitest + Supertest 注入；测试环境不 listen，避免占端口。
 */
export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  });
}
