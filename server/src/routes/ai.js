import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';

const router = Router();

/**
 * POST /api/ai/suggest
 */
router.post('/suggest', aiController.suggest);

export default router;
