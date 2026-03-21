import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createFlagsRouter } from './flags.js';
import { createMockFeatureFlagService } from '../../test/mocks/featureFlagService.mock.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import type { FeatureFlagService } from '../../lib/featureFlags/types.js';

function buildApp(service: Mocked<FeatureFlagService>) {
  const app = express();
  app.use(createFlagsRouter(service));
  app.use(errorHandler());
  return app;
}

describe('GET /flags', () => {
  let service: Mocked<FeatureFlagService>;

  beforeEach(() => {
    service = createMockFeatureFlagService();
  });

  it('returns empty array when service returns no flags', async () => {
    service.getAll.mockResolvedValue([]);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(service.getAll).toHaveBeenCalledOnce();
  });

  it('returns entries sorted by name', async () => {
    service.getAll.mockResolvedValue([
      { name: 'feature-b', enabled: false, updatedAt: '2026-01-01T00:00:00.000Z' },
      { name: 'feature-a', enabled: true, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { name: 'feature-a', enabled: true, updatedAt: '2026-01-01T00:00:00.000Z' },
      { name: 'feature-b', enabled: false, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('includes metadata on each entry', async () => {
    service.getAll.mockResolvedValue([
      { name: 'x', enabled: true, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.body).toEqual([{ name: 'x', enabled: true, updatedAt: '2026-01-01T00:00:00.000Z' }]);
  });
});

describe('GET /flags/:name', () => {
  let service: Mocked<FeatureFlagService>;

  beforeEach(() => {
    service = createMockFeatureFlagService();
  });

  it('returns full entry when flag is on', async () => {
    service.getEntry.mockResolvedValue({
      name: 'my.feature',
      enabled: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const res = await request(buildApp(service)).get('/flags/my.feature');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name: 'my.feature',
      enabled: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(service.getEntry).toHaveBeenCalledWith('my.feature');
  });

  it('returns full entry when flag is off in store', async () => {
    service.getEntry.mockResolvedValue({
      name: 'my-feature',
      enabled: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const res = await request(buildApp(service)).get('/flags/my-feature');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name: 'my-feature',
      enabled: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('returns entry without updatedAt for unknown names', async () => {
    service.getEntry.mockResolvedValue({ name: 'unknown', enabled: false });
    const res = await request(buildApp(service)).get('/flags/unknown');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'unknown', enabled: false });
  });

  it('returns 400 for invalid flag name', async () => {
    const res = await request(buildApp(service)).get('/flags/BAD');
    expect(res.status).toBe(400);
    expect(service.getEntry).not.toHaveBeenCalled();
  });
});
