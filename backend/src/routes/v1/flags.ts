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
import { getListQuery, listPageQueryValidators } from '../../lib/pagination/listQuery.js';

export function createFlagsRouter(service: FeatureFlagService): Router {
  const router = Router();

  router.get(
    '/flags',
    validate(listPageQueryValidators),
    wrapAsync(async (req, res) => {
      const { page, pageSize } = getListQuery(req);
      const result = await service.list(page, pageSize);
      res.json(result);
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
