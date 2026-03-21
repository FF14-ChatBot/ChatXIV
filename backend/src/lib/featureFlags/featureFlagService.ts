import type { FeatureFlagEntry } from '@chatxiv/cdm';
import type { FeatureFlagService, FeatureFlagStore } from './types.js';
import { AppError } from '../errors/AppError.js';

export function createFeatureFlagService(store: FeatureFlagStore): FeatureFlagService {
  return {
    async getAll(): Promise<FeatureFlagEntry[]> {
      const all = await store.getAll();
      return Object.entries(all).map(([name, record]) => ({
        name,
        enabled: record.enabled,
        updatedAt: record.updatedAt,
      }));
    },

    async getEntry(name: string): Promise<FeatureFlagEntry> {
      const record = await store.get(name);
      if (record) {
        return { name, enabled: record.enabled, updatedAt: record.updatedAt };
      }
      return { name, enabled: false };
    },

    async setFlag(name: string, enabled: boolean): Promise<FeatureFlagEntry> {
      await store.set(name, enabled);
      const record = await store.get(name);
      return { name, enabled: record!.enabled, updatedAt: record!.updatedAt };
    },

    async removeFlag(name: string): Promise<void> {
      const existed = await store.remove(name);
      if (!existed) {
        throw AppError.validation(`Flag "${name}" does not exist`);
      }
    },
  };
}
