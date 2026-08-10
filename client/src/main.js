import { createApp, h } from 'vue';
import { RouterView } from 'vue-router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './styles/theme.css';
import router from './router/index.js';

/**
 * 根组件：仅渲染路由出口（未单独创建 App.vue）。
 */
const App = {
  name: 'App',
  render() {
    return h(RouterView);
  },
};

createApp(App).use(ElementPlus).use(router).mount('#app');
