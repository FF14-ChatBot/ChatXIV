import { Router } from 'express';
import { body, header } from 'express-validator';
import {
  FEEDBACK_RATINGS,
  FEEDBACK_REASON_CODES,
  FEEDBACK_FREE_TEXT_MAX_LENGTH,
  HTTP_HEADER_NAMES_LOWER,
  USAGE_CATEGORIES,
} from '@chatxiv/cdm';
import type { FeedbackBody } from '@chatxiv/cdm';
import { validate } from '../../middleware/validate.js';
import { wrapAsync } from '../../middleware/asyncHandler.js';
import type { FeedbackService } from '../../lib/feedback/types.js';

export function createFeedbackRouter(service: FeedbackService): Router {
  const router = Router();

  router.post(
    '/feedback',
    validate([
      header(HTTP_HEADER_NAMES_LOWER.IDEMPOTENCY_KEY)
        .isString()
        .notEmpty()
        .withMessage('Idempotency-Key header is required'),
      body('messageId').isString().notEmpty().withMessage('messageId is required'),
      body('rating')
        .isString()
        .isIn([...FEEDBACK_RATINGS])
        .withMessage(`rating must be one of: ${FEEDBACK_RATINGS.join(', ')}`),
      body('reasonCode')
        .isString()
        .isIn([...FEEDBACK_REASON_CODES])
        .withMessage(`reasonCode must be one of: ${FEEDBACK_REASON_CODES.join(', ')}`),
      body('freeText')
        .optional()
        .isString()
        .isLength({ max: FEEDBACK_FREE_TEXT_MAX_LENGTH })
        .withMessage(`freeText must be at most ${FEEDBACK_FREE_TEXT_MAX_LENGTH} characters`),
      body('category')
        .optional()
        .isString()
        .isIn([...USAGE_CATEGORIES])
        .withMessage('category must be a known usage category'),
    ]),
    wrapAsync(async (req, res) => {
      const idempotencyKey = req.headers[HTTP_HEADER_NAMES_LOWER.IDEMPOTENCY_KEY] as string;
      const feedbackBody = req.body as FeedbackBody;
      const result = service.submit(idempotencyKey, feedbackBody);
      res.status(200).json(result);
    })
  );

  return router;
}
