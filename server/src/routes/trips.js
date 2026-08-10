import { Router } from 'express';
import * as tripController from '../controllers/tripController.js';

const router = Router();

router.get('/', tripController.listTrips);
router.post('/', tripController.createTrip);
router.get('/:id', tripController.getTrip);
router.put('/:id', tripController.updateTrip);
router.delete('/:id', tripController.deleteTrip);

export default router;
