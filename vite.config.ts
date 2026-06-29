import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// demo 开发服务器（占位页）。root 指向 demo/，从 ../src 引入库。
export default defineConfig({
  root: 'demo',
  plugins: [react()],
  server: { open: true },
});
