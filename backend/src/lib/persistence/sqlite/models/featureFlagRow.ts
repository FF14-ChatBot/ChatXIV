/** Row shape for `feature_flags` queries (snake_case columns). */
export type FeatureFlagRow = {
  name: string;
  enabled: 0 | 1;
  created_at: number;
  updated_at: number;
};
