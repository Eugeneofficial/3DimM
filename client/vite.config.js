import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

const PORT = parseInt(process.env.DIMM_PORT || '3001', 10);

function removeCrossorigin() {
  return {
    name: 'remove-crossorigin',
    closeBundle() {
      try {
        const htmlPath = resolve(__dirname, 'dist', 'index.html');
        let html = readFileSync(htmlPath, 'utf8');
        html = html.replace(/\bcrossorigin\b\s*/g, '');
        writeFileSync(htmlPath, html);
      } catch {}
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCrossorigin()],
  server: {
    proxy: {
      '/api': `http://localhost:${PORT}`,
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'dplayer': ['dplayer'],
          'hls': ['hls.js'],
        },
      },
    },
  },
});
