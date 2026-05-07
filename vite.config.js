import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/live-pickle/v2/',
  build: {
    outDir: 'v2',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'adm.html'),
        viewer: resolve(__dirname, 'index.html'),
      },
    },
  },
});
