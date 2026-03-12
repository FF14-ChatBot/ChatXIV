import { describe, it, expect, afterEach } from 'vitest';
import { debugMode } from './debugMode.js';

const KEY = 'DEBUG_MODE';

describe('lib/debug/debugMode', () => {
  afterEach(() => {
    delete process.env[KEY];
  });

  it.each([undefined, ''])('returns false when DEBUG_MODE is %j', (value) => {
    if (value === undefined) delete process.env[KEY];
    else process.env[KEY] = value;
    expect(debugMode.isEnabled()).toBe(false);
  });

  it.each(['true', 'TRUE', 'TrUe', '1'])('returns true when DEBUG_MODE is %j', (value) => {
    process.env[KEY] = value;
    expect(debugMode.isEnabled()).toBe(true);
  });

  it.each(['false', '0', 'nope'])('returns false when DEBUG_MODE is %j', (value) => {
    process.env[KEY] = value;
    expect(debugMode.isEnabled()).toBe(false);
  });
});
