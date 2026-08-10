import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * Vite 配置：开发服代理 /api 到后端，保持路径不 rewrite。
 */
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
