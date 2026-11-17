import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.warn('[Vite Proxy Warning] Backend unreachable at ' + options.target + ': ' + err.message);
            if (res && !res.headersSent && res.writeHead) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                detail: `Backend server is unreachable at ${options.target}. Please ensure the FastAPI backend is running on port 8001 (run: python main.py in backend).`
              }));
            }
          });
        },
      },
    },
  },
});
