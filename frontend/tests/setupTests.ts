import '@testing-library/jest-dom/vitest';
import { setLogger } from '@/lib/logger/instance';
import type { ILogger } from '@/lib/logger/types';

const noopLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

setLogger(noopLogger);
