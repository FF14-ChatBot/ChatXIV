export const LIST_DEFAULT_PAGE = 1;
export const LIST_DEFAULT_PAGE_SIZE = 50;
export const LIST_MAX_PAGE_SIZE = 500;

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
