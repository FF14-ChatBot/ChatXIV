import { query, matchedData } from 'express-validator';
import { LIST_DEFAULT_PAGE, LIST_DEFAULT_PAGE_SIZE, LIST_MAX_PAGE_SIZE } from '@chatxiv/cdm';
import type { Request } from 'express';

/**
 * Query validators for offset-based list routes (`page`, `pageSize`).
 * Use with {@link validate} then {@link getListQuery} in the handler.
 */
export const listPageQueryValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: LIST_MAX_PAGE_SIZE })
    .withMessage(`pageSize must be between 1 and ${LIST_MAX_PAGE_SIZE}`)
    .toInt(),
];

type ListQueryMatched = {
  page?: number;
  pageSize?: number;
};

/**
 * Resolved pagination params after `listPageQueryValidators` + `validate()` have run.
 */
export function getListQuery(req: Request): { page: number; pageSize: number } {
  const q = matchedData(req, { locations: ['query'] }) as ListQueryMatched;
  return {
    page: q.page ?? LIST_DEFAULT_PAGE,
    pageSize: q.pageSize ?? LIST_DEFAULT_PAGE_SIZE,
  };
}
