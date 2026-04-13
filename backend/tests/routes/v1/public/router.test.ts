import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPublicRouter } from '@src/routes/v1/public/router.js';
import { createMockFeatureFlagService } from '@test/mocks/featureFlagService.mock.js';
import { createMockFeedbackService } from '@test/mocks/feedbackService.mock.js';
import { createMockChatService } from '@test/mocks/chatService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';
import type { FeedbackService } from '@src/lib/feedback/types.js';
import type { ChatService } from '@src/lib/chat/types.js';

function buildApp(
  flagService: Mocked<FeatureFlagService>,
  feedbackService: Mocked<FeedbackService>,
  chatService: Mocked<ChatService>
) {
  const app = express();
  app.use(express.json());
  app.use('/v1', createPublicRouter(flagService, feedbackService, chatService));
  app.use(errorHandler());
  return app;
}

describe('createPublicRouter', () => {
  let flagService: Mocked<FeatureFlagService>;
  let feedbackService: Mocked<FeedbackService>;
  let chatService: Mocked<ChatService>;

  const savedEnv = { ...process.env };

  beforeEach(() => {
    flagService = createMockFeatureFlagService();
    feedbackService = createMockFeedbackService();
    chatService = createMockChatService();
    process.env = { ...savedEnv };
  });

  it('serves public OpenAPI YAML when not production', async () => {
    process.env.NODE_ENV = 'development';
    const res = await request(buildApp(flagService, feedbackService, chatService)).get(
      '/v1/openapi.yaml'
    );
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/yaml/);
    expect(res.text).toContain('ChatXIV API (public)');
  });

  it('does not mount public OpenAPI in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(buildApp(flagService, feedbackService, chatService)).get(
      '/v1/openapi.yaml'
    );
    expect(res.status).toBe(404);
  });

  it('mounts flags under /v1', async () => {
    flagService.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 });
    const res = await request(buildApp(flagService, feedbackService, chatService)).get('/v1/flags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
    expect(flagService.list).toHaveBeenCalledWith(1, 50);
  });

  it('mounts feedback under /v1', async () => {
    const res = await request(buildApp(flagService, feedbackService, chatService))
      .post('/v1/feedback')
      .set('Idempotency-Key', 'test-key')
      .send({ messageId: 'msg-1', rating: 'up', reasonCode: 'other' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
