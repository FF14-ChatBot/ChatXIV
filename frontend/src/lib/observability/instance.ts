import type { Observability } from './types.js';
import { createNoopObservability } from './noopObservability.js';

let instance: Observability = createNoopObservability();

export function setObservability(observability: Observability): void {
  instance = observability;
}

export function getObservability(): Observability {
  return instance;
}

export function pushError(error: Error, context?: Record<string, string>): void {
  instance.pushError(error, context);
}

export function pushLog(message: string, context?: Record<string, string>): void {
  instance.pushLog(message, context);
}

export function setUser(userId: string, attributes?: Record<string, string>): void {
  instance.setUser(userId, attributes);
}

export function resetUser(): void {
  instance.resetUser();
}
