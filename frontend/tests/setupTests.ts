import '@testing-library/jest-dom/vitest';
import { setLogger } from '@/lib/logger/instance';
import type { Logger } from '@/lib/logger/types';

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

setLogger(noopLogger);
