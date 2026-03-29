import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPublicRouter } from '@src/routes/v1/public/router.js';
import { createMockFeatureFlagService } from '@test/mocks/featureFlagService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';

function buildApp(service: Mocked<FeatureFlagService>, db: SqliteDatabase) {
  const app = express();
  app.use('/v1', createPublicRouter(service, db));
  app.use(errorHandler());
  return app;
}

describe('createPublicRouter', () => {
  let service: Mocked<FeatureFlagService>;
  let db: SqliteDatabase;

  const savedEnv = { ...process.env };

  beforeEach(() => {
    service = createMockFeatureFlagService();
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
    process.env = { ...savedEnv };
  });

  it('serves public OpenAPI YAML when not production', async () => {
    process.env.NODE_ENV = 'test';
    const res = await request(buildApp(service, db)).get('/v1/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/yaml/);
    expect(res.text).toContain('ChatXIV API (public)');
  });

  it('does not mount public OpenAPI in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(buildApp(service, db)).get('/v1/openapi.yaml');
    expect(res.status).toBe(404);
  });

  it('mounts flags under /v1', async () => {
    service.getAll.mockResolvedValue([]);
    const res = await request(buildApp(service, db)).get('/v1/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
