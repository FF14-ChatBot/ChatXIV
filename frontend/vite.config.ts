import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Tunnel: allow *.chatxiv.com Host; bind for IPv4 loopback (cloudflared→127.0.0.1:5173), not ::1-only.
    host: true,
    allowedHosts: ['.chatxiv.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
