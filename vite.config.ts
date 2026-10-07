import { defineConfig } from 'vite';
import { pwaPlugin } from './scripts/pwa.ts';
import { apiPlugin } from './src/infrastructure/server/api.ts';
export default defineConfig({
  plugins: [apiPlugin(import.meta.dirname), pwaPlugin()],
  server: { host: '127.0.0.1', port: 8767, strictPort: true },
  preview: { host: '127.0.0.1', port: 8767, strictPort: true },
  build: { target: 'es2022' },
});
