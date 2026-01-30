import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: './',  // Look for .env in the same directory (app/client when built)
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
});
