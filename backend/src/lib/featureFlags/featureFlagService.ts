import type { FeatureFlagEntry, PaginatedResult } from '@chatxiv/cdm';
import type { FeatureFlagService, FeatureFlagStore } from './types.js';
import { AppError } from '../errors/AppError.js';

export function createFeatureFlagService(store: FeatureFlagStore): FeatureFlagService {
  return {
    async list(page: number, pageSize: number): Promise<PaginatedResult<FeatureFlagEntry>> {
      const all = await store.getAll();
      const entries = Object.entries(all).map(([name, record]) => ({
        name,
        enabled: record.enabled,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));
      entries.sort((a, b) => a.name.localeCompare(b.name));
      const total = entries.length;
      const offset = (page - 1) * pageSize;
      const items = entries.slice(offset, offset + pageSize);
      return { items, total, page, pageSize };
    },

    async getEntry(name: string): Promise<FeatureFlagEntry> {
      const record = await store.get(name);
      if (record) {
        return {
          name,
          enabled: record.enabled,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };
      }
      return { name, enabled: false };
    },

    async setFlag(name: string, enabled: boolean): Promise<FeatureFlagEntry> {
      await store.set(name, enabled);
      const record = await store.get(name);
      return {
        name,
        enabled: record!.enabled,
        createdAt: record!.createdAt,
        updatedAt: record!.updatedAt,
      };
    },

    async removeFlag(name: string): Promise<void> {
      const existed = await store.remove(name);
      if (!existed) {
        throw AppError.validation(`Flag "${name}" does not exist`);
      }
    },
  };
}
