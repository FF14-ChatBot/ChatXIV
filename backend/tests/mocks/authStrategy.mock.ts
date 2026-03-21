import { vi, type Mocked } from 'vitest';
import type { AuthStrategy } from '@src/lib/auth/types.js';

export function createMockAuthStrategy(authenticated = true): Mocked<AuthStrategy> {
  return {
    authenticate: vi.fn().mockResolvedValue({ authenticated }),
  } as Mocked<AuthStrategy>;
}
