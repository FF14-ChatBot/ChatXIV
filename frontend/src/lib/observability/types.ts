/** Manual observability operations. Automatic instrumentations (errors, perf, traces) are configured at init time. */
export interface Observability {
  pushError(error: Error, context?: Record<string, string>): void;
  pushLog(message: string, context?: Record<string, string>): void;
  setUser(userId: string, attributes?: Record<string, string>): void;
  resetUser(): void;
}
