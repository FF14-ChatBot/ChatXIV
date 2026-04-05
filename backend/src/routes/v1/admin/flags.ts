import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../middleware/validate.js';
import { wrapAsync } from '../../../middleware/asyncHandler.js';
import {
  FLAG_NAME_PATTERN,
  FLAG_NAME_VALIDATION_MESSAGE,
} from '../../../lib/featureFlags/flagNameParam.js';
import type { FeatureFlagService } from '../../../lib/featureFlags/types.js';
import { getListQuery, listPageQueryValidators } from '../../../lib/pagination/listQuery.js';

export function createAdminFlagsRouter(service: FeatureFlagService): Router {
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

  router.put(
    '/flags/:name',
    validate([
      param('name').isString().matches(FLAG_NAME_PATTERN).withMessage(FLAG_NAME_VALIDATION_MESSAGE),
      body('enabled').isBoolean().withMessage('enabled must be a boolean'),
    ]),
    wrapAsync(async (req, res) => {
      const { name } = req.params;
      const { enabled } = req.body as { enabled: boolean };
      const entry = await service.setFlag(name, enabled);
      res.json(entry);
    })
  );

  router.delete(
    '/flags/:name',
    validate([
      param('name').isString().matches(FLAG_NAME_PATTERN).withMessage(FLAG_NAME_VALIDATION_MESSAGE),
    ]),
    wrapAsync(async (req, res) => {
      const { name } = req.params;
      await service.removeFlag(name);
      res.status(204).end();
    })
  );

  return router;
}
