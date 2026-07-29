/**
 * Standalone smoke test for the MediaWiki client against the real wikis -- no server, no DI
 * container, no chat pipeline. Proves the client itself talks to ConsoleGamesWiki and Fandom
 * FFXIV correctly before wiring anything around it.
 *
 * Usage (from backend/): npm run smoke:mediawiki -- "how do I unlock the Palace of the Dead"
 * Reads the same MEDIAWIKI_* env vars as the real app (backend/.env), via the same
 * createMediaWikiClientFromEnv() factory the DI container uses, so this script and the real app
 * are guaranteed to build the client identically.
 */
import '../../src/lib/config/loadDotenv.js';

import { createMediaWikiClientFromEnv } from '../../src/lib/mediawiki/client.js';
import { MediaWikiWikiId } from '../../src/lib/config/constants.js';
import { logger } from '../../src/lib/observability/logger.js';

const query = process.argv[2] ?? 'how do I unlock the Palace of the Dead';

async function main(): Promise<void> {
  const { client } = createMediaWikiClientFromEnv(logger);

  for (const wikiId of [MediaWikiWikiId.ConsoleGamesWiki, MediaWikiWikiId.FandomFfxiv]) {
    console.log(`\n=== ${wikiId}: search("${query}") ===`);
    const result = await client.search(wikiId, query, 5);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err: unknown) => {
  console.error('MediaWiki smoke test failed:', err);
  process.exitCode = 1;
});
