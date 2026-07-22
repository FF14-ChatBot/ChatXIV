import { describe, it, expect, beforeAll } from 'vitest';
import { register } from '@src/lib/di/container.js';
import { createApp } from '@src/app.js';

describe('app settings', () => {
  beforeAll(() => {
    register();
  });

  it('trusts exactly one reverse-proxy hop for forwarded client addresses', () => {
    const app = createApp();
    expect(app.get('trust proxy')).toBe(1);
  });
});
