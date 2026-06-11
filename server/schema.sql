CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  schema_version INTEGER NOT NULL,
  app_version TEXT,
  size_bytes INTEGER NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backups_user ON backups(username, id);
