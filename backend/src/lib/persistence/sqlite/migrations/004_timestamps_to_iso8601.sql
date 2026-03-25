-- Convert all INTEGER epoch-ms timestamp columns to TEXT ISO 8601 for human readability.
-- Recreates tables so column affinity is TEXT (not just storing text in INTEGER-affinity columns).

-- ──── feature_flags ────

CREATE TABLE feature_flags_new (
  name TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO feature_flags_new (name, enabled, created_at, updated_at)
SELECT name, enabled,
       strftime('%Y-%m-%dT%H:%M:%fZ', created_at / 1000.0, 'unixepoch'),
       strftime('%Y-%m-%dT%H:%M:%fZ', updated_at / 1000.0, 'unixepoch')
FROM feature_flags;

DROP TABLE feature_flags;
ALTER TABLE feature_flags_new RENAME TO feature_flags;

CREATE INDEX IF NOT EXISTS idx_feature_flags_created_at ON feature_flags(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_flags_updated_at ON feature_flags(updated_at);

-- ──── users ────

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  iss TEXT NOT NULL,
  sub TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  UNIQUE(iss, sub)
);

INSERT INTO users_new (id, iss, sub, email, display_name, avatar_url, is_admin, created_at, last_login_at)
SELECT id, iss, sub, email, display_name, avatar_url, is_admin,
       strftime('%Y-%m-%dT%H:%M:%fZ', created_at / 1000.0, 'unixepoch'),
       strftime('%Y-%m-%dT%H:%M:%fZ', last_login_at / 1000.0, 'unixepoch')
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_users_iss_sub ON users(iss, sub);

-- ──── sessions ────

CREATE TABLE sessions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT
);

INSERT INTO sessions_new (id, user_id, expires_at, created_at, user_agent, ip_address)
SELECT id, user_id,
       strftime('%Y-%m-%dT%H:%M:%fZ', expires_at / 1000.0, 'unixepoch'),
       strftime('%Y-%m-%dT%H:%M:%fZ', created_at / 1000.0, 'unixepoch'),
       user_agent, ip_address
FROM sessions;

DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ──── schema_migrations ────

CREATE TABLE schema_migrations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);

INSERT INTO schema_migrations_new (id, name, applied_at)
SELECT id, name,
       CASE WHEN typeof(applied_at) = 'integer'
            THEN strftime('%Y-%m-%dT%H:%M:%fZ', applied_at / 1000.0, 'unixepoch')
            ELSE applied_at
       END
FROM schema_migrations;

DROP TABLE schema_migrations;
ALTER TABLE schema_migrations_new RENAME TO schema_migrations;
