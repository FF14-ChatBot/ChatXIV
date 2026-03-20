import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { createApiKeyAuthStrategy } from './apiKeyAuthStrategy.js';

describe('lib/auth/apiKeyAuthStrategy', () => {
  const strategy = createApiKeyAuthStrategy('test-secret');

  function req(headers: Record<string, string | undefined> = {}): Request {
    return { headers } as unknown as Request;
  }

  it('authenticates when x-admin-key matches', async () => {
    const result = await strategy.authenticate(req({ 'x-admin-key': 'test-secret' }));
    expect(result.authenticated).toBe(true);
  });

  it('rejects when x-admin-key does not match', async () => {
    const result = await strategy.authenticate(req({ 'x-admin-key': 'wrong-key' }));
    expect(result.authenticated).toBe(false);
  });

  it('rejects when x-admin-key is missing', async () => {
    const result = await strategy.authenticate(req());
    expect(result.authenticated).toBe(false);
  });

  it('rejects when x-admin-key is empty', async () => {
    const result = await strategy.authenticate(req({ 'x-admin-key': '' }));
    expect(result.authenticated).toBe(false);
  });

  it('rejects when constructed with empty key and request also empty', async () => {
    const noKeyStrategy = createApiKeyAuthStrategy('');
    const result = await noKeyStrategy.authenticate(req({ 'x-admin-key': '' }));
    expect(result.authenticated).toBe(false);
  });
});
