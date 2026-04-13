import { Router } from 'express';
import { isProduction } from '../../../lib/config/env.js';
import type { FeatureFlagService } from '../../../lib/featureFlags/types.js';
import type { FeedbackService } from '../../../lib/feedback/types.js';
import type { ChatService } from '../../../lib/chat/types.js';
import { mountPublicOpenApiDocs } from '../../../lib/openapi/openApiDocs.js';
import { createFlagsRouter } from '../flags.js';
import { createFeedbackRouter } from '../feedback.js';
import { createChatRouter } from '../chat.js';

/**
 * Public versioned surface: feature flags (`/flags`), feedback (`/feedback`),
 * chat (`/chat`, `/chat/stream`); in non-production only, OpenAPI + Swagger.
 * Mount at `/v1` in `app.ts`.
 */
export function createPublicRouter(
  flagService: FeatureFlagService,
  feedbackService: FeedbackService,
  chatService: ChatService
): Router {
  const router = Router();
  if (!isProduction()) {
    mountPublicOpenApiDocs(router);
  }
  router.use(createFlagsRouter(flagService));
  router.use(createFeedbackRouter(feedbackService));
  router.use(createChatRouter(chatService));
  return router;
}
