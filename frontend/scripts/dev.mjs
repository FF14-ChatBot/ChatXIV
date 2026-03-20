import { createServer } from 'vite';
import { registerGracefulShutdown } from './gracefulShutdown.mjs';

const server = await createServer();
await server.listen();
server.printUrls();

registerGracefulShutdown({
  name: 'vite-dev',
  close: () => server.close(),
});
