import { Router } from 'express';
import * as spotController from '../controllers/spotController.js';

/**
 * 挂载于 `/api/trips/:tripId/spots` 的嵌套路由。
 * 注意：`/bulk` 声明在 `/` 之前，避免被更泛化路径抢先匹配。
 */
export const tripSpotRoutes = Router({ mergeParams: true });

tripSpotRoutes.get('/', spotController.listSpots);
tripSpotRoutes.post('/bulk', spotController.bulkCreateSpots);
tripSpotRoutes.post('/', spotController.createSpot);

/**
 * 挂载于 `/api/spots` 的资源路由（按景点 id 操作）。
 */
const spotRoutes = Router();

spotRoutes.patch('/:id', spotController.patchSpot);
spotRoutes.delete('/:id', spotController.deleteSpot);

export default spotRoutes;
