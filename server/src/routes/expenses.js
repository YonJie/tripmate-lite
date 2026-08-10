import { Router } from 'express';
import * as expenseController from '../controllers/expenseController.js';

/**
 * 挂载于 `/api/trips/:tripId/expenses` 的嵌套路由。
 */
export const tripExpenseRoutes = Router({ mergeParams: true });

tripExpenseRoutes.get('/', expenseController.listExpenses);
tripExpenseRoutes.post('/', expenseController.createExpense);

/**
 * 挂载于 `/api/trips/:tripId/summary` 的汇总路由。
 */
export const tripSummaryRoutes = Router({ mergeParams: true });

tripSummaryRoutes.get('/', expenseController.getSummary);

/**
 * 挂载于 `/api/expenses` 的资源路由（按费用 id 操作）。
 */
const expenseRoutes = Router();

expenseRoutes.delete('/:id', expenseController.deleteExpense);

export default expenseRoutes;
