import { preview } from 'vite';
import { registerGracefulShutdown } from './gracefulShutdown.mjs';

const previewServer = await preview();
previewServer.printUrls();

registerGracefulShutdown({
  name: 'vite-preview',
  close: () => previewServer.close(),
});
