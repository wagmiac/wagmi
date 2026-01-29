/**
 * 环境变量加载器
 * 这个模块必须最先被导入，以确保 .env 在其他模块使用 process.env 之前加载
 */
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 获取当前文件所在目录，然后找到项目根目录的 .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env');
const result = loadEnv({ path: envPath });

console.log(`[Config] Loading .env from: ${envPath}`);
console.log(`[Config] PORT = ${process.env.PORT || '3001 (default)'}`);

export { envPath, result };
