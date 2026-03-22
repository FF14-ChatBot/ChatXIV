import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { registerGracefulShutdown } from './gracefulShutdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Programmatic createServer() can omit merged server.*; repeat allowedHosts + host here so
// tunnel Host headers and cloudflared→127.0.0.1:5173 still work (see vite.config.ts).
// Note: `vite.config.ts` is intentionally not on the parent `node --watch` path in package.json.
// Watching it caused full dev-server restarts on save; the new process often grabbed 5173 before
// the old one released it (EADDRINUSE / Vite falling through to the next port).
const tunnelAllowedHosts = ['.chatxiv.com'];

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: {
    allowedHosts: tunnelAllowedHosts,
    host: true,
  },
});
await server.listen();
server.printUrls();

registerGracefulShutdown({
  name: 'vite-dev',
  close: () => server.close(),
});
