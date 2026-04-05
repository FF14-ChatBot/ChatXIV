import { vi, type Mocked } from 'vitest';
import type { FeedbackService } from '@src/lib/feedback/types.js';

export function createMockFeedbackService(): Mocked<FeedbackService> {
  return {
    submit: vi.fn().mockReturnValue({ ok: true }),
    list: vi.fn().mockReturnValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    getCountByCategory: vi.fn().mockReturnValue({}),
  } as Mocked<FeedbackService>;
}
