import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { createAdminRouter } from '@src/routes/v1/admin/router.js';
import { requireAdminMiddleware } from '@src/middleware/userAuth.js';
import { createMockFeatureFlagService } from '@test/mocks/featureFlagService.mock.js';
import { createMockFeedbackService } from '@test/mocks/feedbackService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';
import type { FeedbackService } from '@src/lib/feedback/types.js';

vi.mock('@src/lib/request/requestContext.js', () => ({
  requestContext: { get: () => ({ requestId: 'test-req-id' }) },
}));

function buildApp(
  flagService: Mocked<FeatureFlagService>,
  feedbackService: Mocked<FeedbackService>,
  isAdmin = true
) {
  const app = express();
  app.use(express.json());

  if (isAdmin) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'u1', isAdmin: true };
      next();
    });
  }

  app.use(createAdminRouter(requireAdminMiddleware, flagService, feedbackService));
  app.use(errorHandler());
  return app;
}

describe('admin feedback routes', () => {
  let flagService: Mocked<FeatureFlagService>;
  let feedbackService: Mocked<FeedbackService>;

  beforeEach(() => {
    flagService = createMockFeatureFlagService();
    feedbackService = createMockFeedbackService();
  });

  describe('GET /feedbacks', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(buildApp(flagService, feedbackService, false)).get('/feedbacks');
      expect(res.status).toBe(401);
      expect(feedbackService.list).not.toHaveBeenCalled();
    });

    it('returns empty page when no submissions', async () => {
      feedbackService.list.mockReturnValue({ items: [], total: 0, page: 1, pageSize: 50 });
      const res = await request(buildApp(flagService, feedbackService)).get('/feedbacks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
      expect(feedbackService.list).toHaveBeenCalledWith(1, 50);
    });

    it('passes page and pageSize to the service', async () => {
      feedbackService.list.mockReturnValue({ items: [], total: 0, page: 2, pageSize: 25 });
      const res = await request(buildApp(flagService, feedbackService)).get(
        '/feedbacks?page=2&pageSize=25'
      );
      expect(res.status).toBe(200);
      expect(feedbackService.list).toHaveBeenCalledWith(2, 25);
    });

    it('returns 400 when pageSize exceeds max', async () => {
      const res = await request(buildApp(flagService, feedbackService)).get(
        '/feedbacks?pageSize=501'
      );
      expect(res.status).toBe(400);
      expect(feedbackService.list).not.toHaveBeenCalled();
    });
  });
});
