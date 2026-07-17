import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/k8scostestimator/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        guide: resolve(__dirname, 'guide.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
