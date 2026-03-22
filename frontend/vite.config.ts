import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Matches AdSense publisher id shape; avoids injecting malformed HTML. */
const ADSENSE_CLIENT_PATTERN = /^ca-pub-\d+$/;

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const raw = env.VITE_PUBLIC_ADSENSE_CLIENT?.trim();
  const adsenseClient =
    raw !== undefined && raw.length > 0 && ADSENSE_CLIENT_PATTERN.test(raw) ? raw : undefined;

  return {
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
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
