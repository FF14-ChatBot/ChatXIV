import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPublicRouter } from '@src/routes/v1/public/router.js';
import { createMockFeatureFlagService } from '@test/mocks/featureFlagService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';

function buildApp(service: Mocked<FeatureFlagService>) {
  const app = express();
  app.use('/v1', createPublicRouter(service));
  app.use(errorHandler());
  return app;
}

describe('createPublicRouter', () => {
  let service: Mocked<FeatureFlagService>;

  beforeEach(() => {
    service = createMockFeatureFlagService();
  });

  it('serves public OpenAPI YAML', async () => {
    const res = await request(buildApp(service)).get('/v1/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/yaml/);
    expect(res.text).toContain('ChatXIV API (public)');
  });

  it('mounts flags under /v1', async () => {
    service.getAll.mockResolvedValue([]);
    const res = await request(buildApp(service)).get('/v1/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
