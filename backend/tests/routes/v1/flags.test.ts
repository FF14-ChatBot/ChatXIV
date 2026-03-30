import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createFlagsRouter } from '@src/routes/v1/flags.js';
import { createMockFeatureFlagService } from '@test/mocks/featureFlagService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';

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

  it('returns empty page when service returns no flags', async () => {
    service.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 });
    const res = await request(buildApp(service)).get('/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
    expect(service.list).toHaveBeenCalledWith(1, 50);
  });

  it('returns paginated items from the service (sorted by name in service layer)', async () => {
    const page = {
      items: [
        {
          name: 'feature-a',
          enabled: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          name: 'feature-b',
          enabled: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 50,
    };
    service.list.mockResolvedValue(page);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(page);
  });

  it('includes metadata on each entry', async () => {
    const page = {
      items: [
        {
          name: 'x',
          enabled: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    };
    service.list.mockResolvedValue(page);
    const res = await request(buildApp(service)).get('/flags');
    expect(res.body).toEqual(page);
  });

  it('passes page and pageSize query params to the service', async () => {
    service.list.mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 10 });
    const res = await request(buildApp(service)).get('/flags?page=2&pageSize=10');
    expect(res.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(2, 10);
  });

  it('returns 400 when pageSize exceeds max', async () => {
    const res = await request(buildApp(service)).get('/flags?pageSize=501');
    expect(res.status).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('returns 400 when page is not a positive integer', async () => {
    const res = await request(buildApp(service)).get('/flags?page=0');
    expect(res.status).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
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
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const res = await request(buildApp(service)).get('/flags/my.feature');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name: 'my.feature',
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(service.getEntry).toHaveBeenCalledWith('my.feature');
  });

  it('returns full entry when flag is off in store', async () => {
    service.getEntry.mockResolvedValue({
      name: 'my-feature',
      enabled: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const res = await request(buildApp(service)).get('/flags/my-feature');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name: 'my-feature',
      enabled: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('returns entry without updatedAt for unknown names', async () => {
    service.getEntry.mockResolvedValue({ name: 'unknown', enabled: false });
    const res = await request(buildApp(service)).get('/flags/unknown');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'unknown', enabled: false });
  });

  it('accepts PascalCase flag names', async () => {
    service.getEntry.mockResolvedValue({
      name: 'MyFeature',
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const res = await request(buildApp(service)).get('/flags/MyFeature');
    expect(res.status).toBe(200);
    expect(service.getEntry).toHaveBeenCalledWith('MyFeature');
  });

  it('returns 400 for invalid flag name', async () => {
    const res = await request(buildApp(service)).get('/flags/bad!');
    expect(res.status).toBe(400);
    expect(service.getEntry).not.toHaveBeenCalled();
  });
});
