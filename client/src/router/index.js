import { createRouter, createWebHistory } from 'vue-router';
import TripList from '../views/TripList.vue';
import TripDetail from '../views/TripDetail.vue';
import Assistant from '../views/Assistant.vue';

/**
 * 前端路由：行程列表 / 详情 / AI 助手。
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/trips',
    },
    {
      path: '/trips',
      name: 'trips',
      component: TripList,
    },
    {
      path: '/trips/:id',
      name: 'trip-detail',
      component: TripDetail,
    },
    {
      path: '/assistant',
      name: 'assistant',
      component: Assistant,
    },
  ],
});

export default router;
