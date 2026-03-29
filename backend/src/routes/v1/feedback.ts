import { Router } from 'express';
import { body, header } from 'express-validator';
import {
  FEEDBACK_RATINGS,
  FEEDBACK_REASON_CODES,
  FEEDBACK_FREE_TEXT_MAX_LENGTH,
} from '@chatxiv/cdm';
import type { FeedbackBody } from '@chatxiv/cdm';
import { validate } from '../../middleware/validate.js';
import { wrapAsync } from '../../middleware/asyncHandler.js';
import { FeedbackSubmissionsDao } from '../../lib/persistence/sqlite/dao/FeedbackSubmissionsDao.js';
import type { SqliteDatabase } from '../../lib/persistence/sqlite/types.js';

export function createFeedbackRouter(db: SqliteDatabase): Router {
  const router = Router();
  const dao = new FeedbackSubmissionsDao(db);

  router.post(
    '/feedback',
    validate([
      header('idempotency-key')
        .isString()
        .notEmpty()
        .withMessage('Idempotency-Key header is required'),
      body('messageId').isString().notEmpty().withMessage('messageId is required'),
      body('rating')
        .isString()
        .isIn([...FEEDBACK_RATINGS])
        .withMessage(`rating must be one of: ${FEEDBACK_RATINGS.join(', ')}`),
      body('reasonCode')
        .optional()
        .isString()
        .isIn([...FEEDBACK_REASON_CODES])
        .withMessage(`reasonCode must be one of: ${FEEDBACK_REASON_CODES.join(', ')}`),
      body('freeText')
        .optional()
        .isString()
        .isLength({ max: FEEDBACK_FREE_TEXT_MAX_LENGTH })
        .withMessage(`freeText must be at most ${FEEDBACK_FREE_TEXT_MAX_LENGTH} characters`),
      body('category').optional().isString(),
    ]),
    wrapAsync(async (req, res) => {
      const idempotencyKey = req.headers['idempotency-key'] as string;
      const { messageId, rating, reasonCode, freeText, category } = req.body as FeedbackBody;

      dao.insertOrSkip({
        idempotency_key: idempotencyKey,
        message_id: messageId,
        rating,
        reason_code: reasonCode ?? null,
        free_text: freeText ?? null,
        category: category ?? null,
      });

      res.status(200).json({ ok: true });
    }),
  );

  return router;
}
