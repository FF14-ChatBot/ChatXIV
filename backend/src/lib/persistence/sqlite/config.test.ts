import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ENV_KEYS } from '../../config/constants.js';
import { getObservabilitySqlitePath, shouldUseSqliteObservability } from './config.js';

describe('persistence/sqlite config', () => {
  const saved = {
    SQLITE_DB_PATH: process.env[ENV_KEYS.SQLITE_DB_PATH],
    OBSERVABILITY_SQLITE: process.env[ENV_KEYS.OBSERVABILITY_SQLITE],
    DATA_DIR: process.env[ENV_KEYS.DATA_DIR],
  };

  beforeEach(() => {
    delete process.env[ENV_KEYS.SQLITE_DB_PATH];
    delete process.env[ENV_KEYS.OBSERVABILITY_SQLITE];
    delete process.env[ENV_KEYS.DATA_DIR];
  });

  afterEach(() => {
    if (saved.SQLITE_DB_PATH === undefined) delete process.env[ENV_KEYS.SQLITE_DB_PATH];
    else process.env[ENV_KEYS.SQLITE_DB_PATH] = saved.SQLITE_DB_PATH;
    if (saved.OBSERVABILITY_SQLITE === undefined) delete process.env[ENV_KEYS.OBSERVABILITY_SQLITE];
    else process.env[ENV_KEYS.OBSERVABILITY_SQLITE] = saved.OBSERVABILITY_SQLITE;
    if (saved.DATA_DIR === undefined) delete process.env[ENV_KEYS.DATA_DIR];
    else process.env[ENV_KEYS.DATA_DIR] = saved.DATA_DIR;
  });

  it('returns null when no sqlite env is set', () => {
    expect(getObservabilitySqlitePath()).toBeNull();
    expect(shouldUseSqliteObservability()).toBe(false);
  });

  it('uses SQLITE_DB_PATH when set', () => {
    process.env[ENV_KEYS.SQLITE_DB_PATH] = './custom/obs.db';
    expect(getObservabilitySqlitePath()).toBe('./custom/obs.db');
    expect(shouldUseSqliteObservability()).toBe(true);
  });

  it('uses DATA_DIR/chatxiv.db when OBSERVABILITY_SQLITE=1', () => {
    process.env[ENV_KEYS.OBSERVABILITY_SQLITE] = '1';
    process.env[ENV_KEYS.DATA_DIR] = './mydata';
    expect(getObservabilitySqlitePath()).toMatch(/mydata[\\/]chatxiv\.db$/);
    expect(shouldUseSqliteObservability()).toBe(true);
  });
});
