import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { Routes } from 'react-router-dom';
import { setLogger } from '@/lib/logger/instance';
import type { Logger } from '@/lib/logger/types';

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

setLogger(noopLogger);

vi.mock('@grafana/faro-react', () => ({
  FaroRoutes: Routes,
  FaroErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));
