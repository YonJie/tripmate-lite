import axios from 'axios';
import { ElMessage } from 'element-plus';

/**
 * 统一 Axios 实例：走 Vite 代理的 `/api` 前缀。
 */
const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

/**
 * 响应拦截：优先展示后端 error.message。
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      '请求失败';
    ElMessage.error(message);
    return Promise.reject(error);
  },
);

export default http;
