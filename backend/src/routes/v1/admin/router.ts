import { Router } from 'express';
import type { FeatureFlagService } from '../../../lib/featureFlags/types.js';
import { AdminAuthMiddleware } from '../../../middleware/adminAuth.js';
import { createAdminFlagsRouter } from './flags.js';

/**
 * Builds the admin router with auth middleware applied to all sub-routes.
 * Any router mounted here automatically requires admin authentication.
 */
export function createAdminRouter(
  authMiddleware: AdminAuthMiddleware,
  flagService: FeatureFlagService
): Router {
  const router = Router();

  router.use(authMiddleware.handler);
  router.use(createAdminFlagsRouter(flagService));

  return router;
}
