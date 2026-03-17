import 'reflect-metadata';
import 'dotenv/config';
import { app } from './app.js';
import { logger } from './lib/observability/logger.js';
import { registerProcessErrorHandlers } from './lib/errors/registerProcessErrorHandlers.js';

registerProcessErrorHandlers(logger);

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  logger.info({ port }, 'Server listening');
});
