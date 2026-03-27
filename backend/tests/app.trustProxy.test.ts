import { describe, it, expect } from 'vitest';
import { app } from '@src/app.js';

describe('app settings', () => {
  it('trusts exactly one reverse-proxy hop for forwarded client addresses', () => {
    expect(app.get('trust proxy')).toBe(1);
  });
});
