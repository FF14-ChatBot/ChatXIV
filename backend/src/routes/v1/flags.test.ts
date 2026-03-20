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

  it('returns empty object when service returns no flags', async () => {
    service.getAll.mockResolvedValue([]);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
    expect(service.getAll).toHaveBeenCalledOnce();
  });

  it('maps entries to name → enabled response', async () => {
    service.getAll.mockResolvedValue([
      { name: 'feature-a', enabled: true, updatedAt: '2026-01-01T00:00:00.000Z' },
      { name: 'feature-b', enabled: false, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ 'feature-a': true, 'feature-b': false });
  });

  it('strips metadata from public response', async () => {
    service.getAll.mockResolvedValue([
      { name: 'x', enabled: true, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.body).toEqual({ x: true });
    expect(res.body.updatedAt).toBeUndefined();
  });
});
