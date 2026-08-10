import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

/**
 * 前端路由：当前仅占位首页。
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
  ],
});

export default router;
