import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3005,
    proxy: {
      '/api': {
        target: 'https://getpos.uz',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'wss://getpos.uz',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

