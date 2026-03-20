import { Router } from 'express';
import type { FeatureFlagsResponse } from '@chatxiv/cdm';
import { wrapAsync } from '../../middleware/asyncHandler.js';
import type { FeatureFlagService } from '../../lib/featureFlags/types.js';

export function createFlagsRouter(service: FeatureFlagService): Router {
  const router = Router();

  router.get(
    '/flags',
    wrapAsync(async (_req, res) => {
      const entries = await service.getAll();
      const response: FeatureFlagsResponse = Object.fromEntries(
        entries.map((entry) => [entry.name, entry.enabled])
      );
      res.json(response);
    })
  );

  return router;
}
