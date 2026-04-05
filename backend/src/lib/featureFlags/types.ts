import type { FeatureFlagEntry, PaginatedResult } from '@chatxiv/cdm';

/** Feature flag storage contract. Async to support both in-memory and Redis backends. */

export interface FeatureFlagRecord {
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FeatureFlagStore {
  get(name: string): Promise<FeatureFlagRecord | undefined>;
  getAll(): Promise<Readonly<Record<string, FeatureFlagRecord>>>;
  set(name: string, enabled: boolean): Promise<void>;
  remove(name: string): Promise<boolean>;
}

/** Business-level operations over feature flags. Routes and other services depend on this. */
export interface FeatureFlagService {
  list(page: number, pageSize: number): Promise<PaginatedResult<FeatureFlagEntry>>;
  getEntry(name: string): Promise<FeatureFlagEntry>;
  setFlag(name: string, enabled: boolean): Promise<FeatureFlagEntry>;
  removeFlag(name: string): Promise<void>;
}
