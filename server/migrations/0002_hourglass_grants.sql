-- Pocket Lab hourglass ledger. One row per finished workout session; the
-- workout app inserts, the Pocket Lab app claims. grant_key is minted by the
-- workout app and is also embedded in the offline claim code.
CREATE TABLE IF NOT EXISTS hourglass_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  grant_key TEXT NOT NULL,
  session_date TEXT NOT NULL,
  hourglasses INTEGER NOT NULL CHECK (hourglasses BETWEEN 1 AND 200),
  breakdown_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  claimed_at TEXT,
  UNIQUE (username, grant_key)
);

CREATE INDEX IF NOT EXISTS idx_hourglass_pending ON hourglass_grants(username, claimed_at);
