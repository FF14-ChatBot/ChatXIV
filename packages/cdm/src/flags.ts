/** Public/admin flag shape. */
export interface FeatureFlagEntry {
  readonly name: string;
  readonly enabled: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/** When off/absent, SPA treats product as not live (`/` → `/unavailable`). */
export const IS_PRODUCT_LIVE = 'isProductLive' as const;

/** Base path for public flag routes (OpenAPI). */
export const FEATURE_FLAGS_PUBLIC_BASE_PATH = '/v1/flags' as const;

export function featureFlagEntryPath(flagName: string): string {
  return `${FEATURE_FLAGS_PUBLIC_BASE_PATH}/${encodeURIComponent(flagName)}`;
}
