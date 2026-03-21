/**
 * Feature flag record for public and admin APIs (`GET /v1/flags`, `GET /v1/flags/:name`, admin CRUD).
 * When `updatedAt` is omitted, the name is not present in the store (lookup still returns `enabled: false`).
 */
export interface FeatureFlagEntry {
  readonly name: string;
  readonly enabled: boolean;
  readonly updatedAt?: string;
}
