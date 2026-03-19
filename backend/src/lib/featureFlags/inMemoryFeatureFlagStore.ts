import type { FeatureFlagRecord, FeatureFlagStore } from './types.js';

export function createInMemoryFeatureFlagStore(): FeatureFlagStore {
  const flags = new Map<string, FeatureFlagRecord>();

  return {
    async get(name: string): Promise<FeatureFlagRecord | undefined> {
      return flags.get(name);
    },

    async getAll(): Promise<Readonly<Record<string, FeatureFlagRecord>>> {
      return Object.fromEntries(flags);
    },

    async set(name: string, enabled: boolean): Promise<void> {
      flags.set(name, { enabled, updatedAt: new Date().toISOString() });
    },

    async remove(name: string): Promise<boolean> {
      return flags.delete(name);
    },
  };
}
