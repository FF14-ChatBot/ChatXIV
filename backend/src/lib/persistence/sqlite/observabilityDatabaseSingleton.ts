import type { SqliteDatabase } from './types.js';
import { getObservabilityDatabasePath } from '../../config/env.js';
import { openObservabilityDatabase } from './openDb.js';

let singleton: SqliteDatabase | null = null;

/** Shared observability DB for metrics + usage (product path). */
export function getOrOpenObservabilityDatabase(): SqliteDatabase {
  if (singleton === null) {
    singleton = openObservabilityDatabase(getObservabilityDatabasePath());
  }
  return singleton;
}

/** Close the singleton if open (e.g. graceful shutdown or tests). Idempotent. */
export function closeObservabilityDatabase(): void {
  if (singleton !== null) {
    singleton.close();
    singleton = null;
  }
}
