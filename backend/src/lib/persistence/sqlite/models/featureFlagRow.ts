/** Row shape for `feature_flags` queries (snake_case columns). */
export type FeatureFlagRow = {
  name: string;
  enabled: 0 | 1;
  /** ISO 8601 UTC string. */
  created_at: string;
  /** ISO 8601 UTC string. */
  updated_at: string;
};
