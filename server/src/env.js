import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 在任意依赖 DATABASE_URL 的模块加载前注入环境变量。
 * ESM 的 import 会提升执行，不能在 index.js 业务代码里再 dotenv.config。
 */
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
