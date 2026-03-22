import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { registerGracefulShutdown } from './gracefulShutdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Programmatic createServer() can omit merged server.*; repeat allowedHosts + host here so
// tunnel Host headers and cloudflared→127.0.0.1:5173 still work (see vite.config.ts).
const tunnelAllowedHosts = ['.chatxiv.com'];

/** Brief retry if 5173 is still held (second dev tab, slow release after stop). */
const LISTEN_RETRY_ATTEMPTS = 15;
const LISTEN_RETRY_DELAY_MS = 200;

function isPortInUseError(error) {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('already in use') || error?.code === 'EADDRINUSE';
}

async function createAndListen() {
  const config = {
    root,
    configFile: path.join(root, 'vite.config.ts'),
    server: {
      allowedHosts: tunnelAllowedHosts,
      host: true,
    },
  };

  for (let attempt = 1; attempt <= LISTEN_RETRY_ATTEMPTS; attempt++) {
    let server;
    try {
      server = await createServer(config);
      await server.listen();
      return server;
    } catch (error) {
      if (server !== undefined) {
        await server.close().catch(() => {});
      }
      if (!isPortInUseError(error) || attempt === LISTEN_RETRY_ATTEMPTS) {
        throw error;
      }
      await delay(LISTEN_RETRY_DELAY_MS);
    }
  }
}

const server = await createAndListen();
server.printUrls();

registerGracefulShutdown({
  name: 'vite-dev',
  close: () => server.close(),
});
