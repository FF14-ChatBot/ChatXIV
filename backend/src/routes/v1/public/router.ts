import { Router } from 'express';
import { isProduction } from '../../../lib/config/env.js';
import type { FeatureFlagService } from '../../../lib/featureFlags/types.js';
import { mountPublicOpenApiDocs } from '../../../lib/openapi/openApiDocs.js';
import { createFlagsRouter } from '../flags.js';

/**
 * Public versioned surface: feature flags (`/flags`); in non-production only, OpenAPI + Swagger.
 * Mount at `/v1` in `app.ts`.
 */
export function createPublicRouter(flagService: FeatureFlagService): Router {
  const router = Router();
  if (!isProduction()) {
    mountPublicOpenApiDocs(router);
  }
  router.use(createFlagsRouter(flagService));
  return router;
}
