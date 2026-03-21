import { Router } from 'express';
import { param } from 'express-validator';
import type { FeatureFlagEntry } from '@chatxiv/cdm';
import { wrapAsync } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  FLAG_NAME_PATTERN,
  FLAG_NAME_VALIDATION_MESSAGE,
} from '../../lib/featureFlags/flagNameParam.js';
import type { FeatureFlagService } from '../../lib/featureFlags/types.js';

export function createFlagsRouter(service: FeatureFlagService): Router {
  const router = Router();

  router.get(
    '/flags',
    wrapAsync(async (_req, res) => {
      const entries = await service.getAll();
      const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
      res.json(sorted);
    })
  );

  router.get(
    '/flags/:name',
    validate([
      param('name').isString().matches(FLAG_NAME_PATTERN).withMessage(FLAG_NAME_VALIDATION_MESSAGE),
    ]),
    wrapAsync(async (req, res) => {
      const { name } = req.params;
      const entry: FeatureFlagEntry = await service.getEntry(name);
      res.json(entry);
    })
  );

  return router;
}
