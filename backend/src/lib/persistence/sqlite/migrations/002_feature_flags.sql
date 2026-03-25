-- Feature flags persisted in the shared application SQLite database.

CREATE TABLE IF NOT EXISTS feature_flags (
  name TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_created_at ON feature_flags(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_flags_updated_at ON feature_flags(updated_at);
