import type { IUsageStore, UsageRecord, UsageCategory } from './usageAnalytics/index.js';

let instance: IUsageStore | null = null;

/** Set the usage store (called by DI container on load). Required before first use of usageAnalytics/getUsageAnalytics. */
export function setUsageAnalytics(store: IUsageStore): void {
  instance = store;
}

/** Get the current store. Throws if setUsageAnalytics() has not been called. */
export function getUsageAnalytics(): IUsageStore {
  if (instance === null) {
    throw new Error(
      'Usage analytics store not initialized. Ensure the DI container is imported (e.g. from app.ts) so setUsageAnalytics() runs.'
    );
  }
  return instance;
}

/** Delegating object for backward compat. Use getUsageAnalytics() in new code when you need the store. */
export const usageAnalytics: IUsageStore = {
  record(entry: UsageRecord): void {
    getUsageAnalytics().record(entry);
  },
  getRecords(): UsageRecord[] {
    return getUsageAnalytics().getRecords();
  },
  getCountByCategory(): Record<UsageCategory, number> {
    return getUsageAnalytics().getCountByCategory();
  },
  clear(): void {
    getUsageAnalytics().clear();
  },
};
