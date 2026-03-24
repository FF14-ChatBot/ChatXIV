import { describe, it, expect, vi, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAdminRouter } from '@src/routes/v1/admin/router.js';
import { AdminAuthMiddleware } from '@src/middleware/adminAuth.js';
import { createMockAuthStrategy } from '@test/mocks/authStrategy.mock.js';
import { createMockFeatureFlagService } from '@test/mocks/featureFlagService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { AuthStrategy } from '@src/lib/auth/types.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';

vi.mock('@src/lib/request/requestContext.js', () => ({
  requestContext: { get: () => ({ requestId: 'test-req-id' }) },
}));

function buildApp(strategy: Mocked<AuthStrategy>, service: Mocked<FeatureFlagService>) {
  const app = express();
  app.use(express.json());
  app.use(createAdminRouter(new AdminAuthMiddleware(strategy), service));
  app.use(errorHandler());
  return app;
}

describe('admin router', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const strategy = createMockAuthStrategy(false);
    const service = createMockFeatureFlagService();
    const res = await request(buildApp(strategy, service)).get('/flags');
    expect(res.status).toBe(401);
    expect(service.getAll).not.toHaveBeenCalled();
  });

  it('allows authenticated requests through to sub-routes', async () => {
    const strategy = createMockAuthStrategy(true);
    const service = createMockFeatureFlagService();
    service.getAll.mockResolvedValue([]);
    const res = await request(buildApp(strategy, service)).get('/flags');
    expect(res.status).toBe(200);
    expect(service.getAll).toHaveBeenCalledOnce();
  });

  it('GET /openapi.yaml returns full OpenAPI YAML when authenticated', async () => {
    const strategy = createMockAuthStrategy(true);
    const service = createMockFeatureFlagService();
    const res = await request(buildApp(strategy, service)).get('/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/yaml/);
    expect(res.text).toContain('ChatXIV API (full)');
    expect(res.text).toContain('/v1/admin/flags');
  });

  it('GET /docs/ serves Swagger UI when authenticated', async () => {
    const strategy = createMockAuthStrategy(true);
    const service = createMockFeatureFlagService();
    const res = await request(buildApp(strategy, service)).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text.toLowerCase()).toContain('swagger');
  });
});
