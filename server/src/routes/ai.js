import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';

const router = Router();

router.post('/suggest', (req, res, next) => {
  aiController.suggest(req, res, next);
});

export default router;
