import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { getAdsenseClient } from './src/lib/adsense/adsenseConfig';

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default defineConfig(() => {
  const adsenseClient = getAdsenseClient();

  return {
    build: {
      /* Default 500 kB is tight for React + router + deps; not a hard limit. */
      chunkSizeWarningLimit: 1024,
    },
    plugins: [
      react(),
      {
        name: 'inject-google-adsense-account-meta',
        transformIndexHtml(html) {
          if (adsenseClient === undefined) {
            return html;
          }
          const safe = escapeHtmlAttribute(adsenseClient);
          const meta = `<meta name="google-adsense-account" content="${safe}" />`;
          return html.replace('<head>', `<head>\n    ${meta}`);
        },
      },
    ],
    server: {
      port: 5173,
      /* Fail fast if 5173 is still held (second dev tab, orphan process). */
      strictPort: true,
      // Tunnel: allow *.chatxiv.com Host; bind for IPv4 loopback (cloudflared→127.0.0.1:5173), not ::1-only.
      host: true,
      allowedHosts: ['.chatxiv.com'],
      proxy: {
        '/v1': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
