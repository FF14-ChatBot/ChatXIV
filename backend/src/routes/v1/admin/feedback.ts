import { Router } from 'express';
import { wrapAsync } from '../../../middleware/asyncHandler.js';
import { validate } from '../../../middleware/validate.js';
import type { FeedbackService } from '../../../lib/feedback/types.js';
import { getListQuery, listPageQueryValidators } from '../../../lib/pagination/listQuery.js';

export function createAdminFeedbackRouter(service: FeedbackService): Router {
  const router = Router();

  router.get(
    '/feedbacks',
    validate(listPageQueryValidators),
    wrapAsync(async (req, res) => {
      const { page, pageSize } = getListQuery(req);
      res.json(service.list(page, pageSize));
    })
  );

  return router;
}
