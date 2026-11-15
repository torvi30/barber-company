import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'strip-crossorigin-from-css',
      transformIndexHtml(html) {
        return html.replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
      }
    }
  ],
  server: {
    port: 5173,
    host: true
  }
});

