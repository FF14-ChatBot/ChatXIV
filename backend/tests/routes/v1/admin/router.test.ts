import { describe, it, expect, vi, type Mocked } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { createAdminRouter } from '@src/routes/v1/admin/router.js';
import { requireAdminMiddleware } from '@src/middleware/userAuth.js';
import { createMockFeatureFlagService } from '@test/mocks/featureFlagService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';

vi.mock('@src/lib/request/requestContext.js', () => ({
  requestContext: { get: () => ({ requestId: 'test-req-id' }) },
}));

function buildApp(service: Mocked<FeatureFlagService>, isAdmin = true) {
  const app = express();
  app.use(express.json());

  if (isAdmin) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'u1', isAdmin: true };
      next();
    });
  }

  app.use(createAdminRouter(requireAdminMiddleware, service));
  app.use(errorHandler());
  return app;
}

describe('admin router', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const service = createMockFeatureFlagService();
    const res = await request(buildApp(service, false)).get('/flags');
    expect(res.status).toBe(401);
    expect(service.getAll).not.toHaveBeenCalled();
  });

  it('allows admin requests through to sub-routes', async () => {
    const service = createMockFeatureFlagService();
    service.getAll.mockResolvedValue([]);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.status).toBe(200);
    expect(service.getAll).toHaveBeenCalledOnce();
  });

  it('GET /openapi.yaml returns full OpenAPI YAML when authenticated', async () => {
    const service = createMockFeatureFlagService();
    const res = await request(buildApp(service)).get('/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/yaml/);
    expect(res.text).toContain('ChatXIV API (full)');
    expect(res.text).toContain('/v1/admin/flags');
  });

  it('GET /docs/ serves Swagger UI when authenticated', async () => {
    const service = createMockFeatureFlagService();
    const res = await request(buildApp(service)).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text.toLowerCase()).toContain('swagger');
  });
});
