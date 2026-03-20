import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../middleware/validate.js';
import { wrapAsync } from '../../../middleware/asyncHandler.js';
import type { FeatureFlagService } from '../../../lib/featureFlags/types.js';

const FLAG_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export function createAdminFlagsRouter(service: FeatureFlagService): Router {
  const router = Router();

  router.get(
    '/flags',
    wrapAsync(async (_req, res) => {
      const entries = await service.getAll();
      res.json(entries);
    })
  );

  router.put(
    '/flags/:name',
    validate([
      param('name')
        .isString()
        .matches(FLAG_NAME_PATTERN)
        .withMessage('Flag name must be lowercase alphanumeric with hyphens, dots, or underscores'),
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
      param('name')
        .isString()
        .matches(FLAG_NAME_PATTERN)
        .withMessage('Flag name must be lowercase alphanumeric with hyphens, dots, or underscores'),
    ]),
    wrapAsync(async (req, res) => {
      const { name } = req.params;
      await service.removeFlag(name);
      res.status(204).end();
    })
  );

  return router;
}
