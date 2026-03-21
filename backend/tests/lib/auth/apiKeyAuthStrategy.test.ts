import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { createApiKeyAuthStrategy } from '@src/lib/auth/apiKeyAuthStrategy.js';

describe('lib/auth/apiKeyAuthStrategy', () => {
  const strategy = createApiKeyAuthStrategy(() => 'test-secret');

  function req(headers: Record<string, string | string[] | undefined> = {}): Request {
    return { headers } as unknown as Request;
  }

  it('authenticates when x-admin-key matches', async () => {
    const result = await strategy.authenticate(req({ 'x-admin-key': 'test-secret' }));
    expect(result.authenticated).toBe(true);
  });

  it('authenticates when x-admin-key has surrounding whitespace', async () => {
    const result = await strategy.authenticate(req({ 'x-admin-key': '  test-secret  ' }));
    expect(result.authenticated).toBe(true);
  });

  it('authenticates when x-admin-key is duplicated as an array (first value wins)', async () => {
    const result = await strategy.authenticate(req({ 'x-admin-key': ['test-secret', 'other'] }));
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
    const noKeyStrategy = createApiKeyAuthStrategy(() => '');
    const result = await noKeyStrategy.authenticate(req({ 'x-admin-key': '' }));
    expect(result.authenticated).toBe(false);
  });

  it('uses latest key when provider changes between calls', async () => {
    let key = 'a';
    const dynamic = createApiKeyAuthStrategy(() => key);
    expect((await dynamic.authenticate(req({ 'x-admin-key': 'a' }))).authenticated).toBe(true);
    key = 'b';
    expect((await dynamic.authenticate(req({ 'x-admin-key': 'a' }))).authenticated).toBe(false);
    expect((await dynamic.authenticate(req({ 'x-admin-key': 'b' }))).authenticated).toBe(true);
  });
});
