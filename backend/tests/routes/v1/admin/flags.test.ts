import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAdminFlagsRouter } from '@src/routes/v1/admin/flags.js';
import { createMockFeatureFlagService } from '@test/mocks/featureFlagService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import { AppError } from '@src/lib/errors/AppError.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';

function buildApp(service: Mocked<FeatureFlagService>) {
  const app = express();
  app.use(express.json());
  app.use(createAdminFlagsRouter(service));
  app.use(errorHandler());
  return app;
}

describe('admin flags routes', () => {
  let service: Mocked<FeatureFlagService>;

  beforeEach(() => {
    service = createMockFeatureFlagService();
  });

  describe('GET /flags', () => {
    it('returns empty array when service returns no flags', async () => {
      service.getAll.mockResolvedValue([]);
      const res = await request(buildApp(service)).get('/flags');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      expect(service.getAll).toHaveBeenCalledOnce();
    });

    it('returns entries with metadata', async () => {
      service.getAll.mockResolvedValue([
        {
          name: 'feature-x',
          enabled: true,
          createdAt: '2026-03-19T00:00:00.000Z',
          updatedAt: '2026-03-19T00:00:00.000Z',
        },
      ]);
      const res = await request(buildApp(service)).get('/flags');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          name: 'feature-x',
          enabled: true,
          createdAt: '2026-03-19T00:00:00.000Z',
          updatedAt: '2026-03-19T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('PUT /flags/:name', () => {
    it('calls service.setFlag and returns the entry', async () => {
      const entry = {
        name: 'new-flag',
        enabled: true,
        createdAt: '2026-03-19T00:00:00.000Z',
        updatedAt: '2026-03-19T00:00:00.000Z',
      };
      service.setFlag.mockResolvedValue(entry);

      const res = await request(buildApp(service)).put('/flags/new-flag').send({ enabled: true });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(entry);
      expect(service.setFlag).toHaveBeenCalledWith('new-flag', true);
    });

    it('rejects invalid flag name with 400', async () => {
      const res = await request(buildApp(service))
        .put('/flags/INVALID NAME!')
        .send({ enabled: true });
      expect(res.status).toBe(400);
      expect(service.setFlag).not.toHaveBeenCalled();
    });

    it('rejects missing enabled field with 400', async () => {
      const res = await request(buildApp(service)).put('/flags/test-flag').send({});
      expect(res.status).toBe(400);
      expect(service.setFlag).not.toHaveBeenCalled();
    });

    it('rejects non-boolean enabled value with 400', async () => {
      const res = await request(buildApp(service)).put('/flags/test-flag').send({ enabled: 'yes' });
      expect(res.status).toBe(400);
      expect(service.setFlag).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /flags/:name', () => {
    it('calls service.removeFlag and returns 204', async () => {
      service.removeFlag.mockResolvedValue(undefined);
      const res = await request(buildApp(service)).delete('/flags/to-delete');
      expect(res.status).toBe(204);
      expect(service.removeFlag).toHaveBeenCalledWith('to-delete');
    });

    it('returns 400 when service throws for non-existent flag', async () => {
      service.removeFlag.mockRejectedValue(AppError.validation('Flag "nope" does not exist'));
      const res = await request(buildApp(service)).delete('/flags/nope');
      expect(res.status).toBe(400);
    });

    it('rejects invalid flag name with 400', async () => {
      const res = await request(buildApp(service)).delete('/flags/BAD NAME');
      expect(res.status).toBe(400);
      expect(service.removeFlag).not.toHaveBeenCalled();
    });
  });
});
