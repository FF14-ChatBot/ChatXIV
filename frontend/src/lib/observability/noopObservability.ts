import type { Observability } from './types.js';

export function createNoopObservability(): Observability {
  return {
    pushError(): void {},
    pushLog(): void {},
    setUser(): void {},
    resetUser(): void {},
  };
}
