import type { ErrorCode } from '@chatxiv/cdm';

export interface NormalizableError {
  readonly status: number;
  readonly code: ErrorCode;
  readonly message: string;
  readonly requestId?: string;
}

export function isNormalizableError(err: unknown): err is NormalizableError {
  if (err === null || typeof err !== 'object') return false;
  const o = err as Record<string, unknown>;
  return (
    typeof o.status === 'number' && typeof o.code === 'string' && typeof o.message === 'string'
  );
}
