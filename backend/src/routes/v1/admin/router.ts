import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { FeatureFlagService } from '../../../lib/featureFlags/types.js';
import type { FeedbackService } from '../../../lib/feedback/types.js';
import {
  chainRequestHandlers,
  createAdminOpenApiYamlHandler,
  createAdminSwaggerUiHandlers,
} from '../../../lib/openapi/openApiDocs.js';
import { createAdminFlagsRouter } from './flags.js';
import { createAdminFeedbackRouter } from './feedback.js';

/**
 * Builds the admin router with auth middleware applied to all sub-routes.
 * Any router mounted here automatically requires admin authentication.
 */
export function createAdminRouter(
  adminGuard: RequestHandler,
  flagService: FeatureFlagService,
  feedbackService: FeedbackService
): Router {
  const router = Router();

  router.use(adminGuard);
  router.get('/openapi.yaml', createAdminOpenApiYamlHandler());
  router.use('/docs', chainRequestHandlers(createAdminSwaggerUiHandlers()));
  router.use(createAdminFlagsRouter(flagService));
  router.use(createAdminFeedbackRouter(feedbackService));

  return router;
}
