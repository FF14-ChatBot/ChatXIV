import { Router } from 'express';
import type { FeatureFlagService } from '../../../lib/featureFlags/types.js';
import { mountPublicOpenApiDocs } from '../../../lib/openapi/openApiDocs.js';
import { createFlagsRouter } from '../flags.js';

/**
 * Public versioned surface: OpenAPI + Swagger (`/openapi.yaml`, `/docs`) and feature flags (`/flags`).
 * Mount at `/v1` in `app.ts`.
 */
export function createPublicRouter(flagService: FeatureFlagService): Router {
  const router = Router();
  mountPublicOpenApiDocs(router);
  router.use(createFlagsRouter(flagService));
  return router;
}
