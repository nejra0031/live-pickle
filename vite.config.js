import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { renameSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const renameOutputHtml = () => ({
  name: 'rename-output-html',
  closeBundle() {
    renameSync('v2/_viewer.html', 'v2/index.html');
    renameSync('v2/_admin.html', 'v2/adm.html');
  },
});

export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === 'build' ? [renameOutputHtml()] : [])],
  base: command === 'build' ? '/live-pickle/v2/' : '/',
  server: {
    open: '/_admin.html',
  },
  build: {
    outDir: 'v2',
    rollupOptions: {
      input: {
        main: resolve(__dirname, '_admin.html'),
        viewer: resolve(__dirname, '_viewer.html'),
      },
    },
  },
}));
