/**
 * Standalone smoke test for the XIVAPI v2 client against the real API -- no server, no DI
 * container, no chat pipeline. Proves the client itself talks to v2.xivapi.com correctly before
 * wiring anything around it.
 *
 * Usage (from backend/): npm run smoke:xivapi -- 'Name~"Potion"'
 * Query syntax is the XIVAPI v2 search grammar (https://v2.xivapi.com/docs), not natural language.
 */
import '../../src/lib/config/loadDotenv.js';

import { createXivApiClient, type XivApiClientConfig } from '../../src/lib/xivapi/XIVApiClient.js';
import { createTokenBucket } from '../../src/lib/http/tokenBucket.js';
import {
  XIVAPI_BASE_URL,
  XIVAPI_TIMEOUT_MS,
  XIVAPI_RATE_LIMIT_PER_SECOND,
  XIVAPI_RATE_LIMIT_BURST,
} from '../../src/lib/config/constants.js';
import { logger } from '../../src/lib/observability/logger.js';

const query = process.argv[2] ?? 'Name~"Potion"';

async function main(): Promise<void> {
  const config: XivApiClientConfig = {
    baseUrl: XIVAPI_BASE_URL,
    timeoutMs: XIVAPI_TIMEOUT_MS,
  };
  const throttle = createTokenBucket(XIVAPI_RATE_LIMIT_PER_SECOND, XIVAPI_RATE_LIMIT_BURST, logger);
  const client = createXivApiClient(config, throttle, logger);

  console.log(`=== XIVAPI: search(${query}) ===`);
  const result = await client.search({ query, sheets: 'Item', limit: 5 });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err: unknown) => {
  console.error('XIVAPI smoke test failed:', err);
  process.exitCode = 1;
});
