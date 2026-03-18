import 'reflect-metadata';
import 'dotenv/config';
import { app } from './app.js';
import { logger } from './lib/observability/logger.js';
import { registerProcessErrorHandlers } from './lib/errors/registerProcessErrorHandlers.js';
import { validateStartupConfig } from './lib/config/validate.js';
import { getPort } from './lib/config/env.js';

validateStartupConfig();
registerProcessErrorHandlers(logger);

const port = getPort();

app.listen(port, () => {
  logger.info({ port }, 'Server listening');
});
