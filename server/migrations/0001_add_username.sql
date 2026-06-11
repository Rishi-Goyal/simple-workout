-- Adds per-user ownership to existing backups tables.
-- Safe to run once on a database created before multi-user support.
ALTER TABLE backups ADD COLUMN username TEXT NOT NULL DEFAULT '';

-- Claim pre-existing backups for the original single user.
UPDATE backups SET username = 'ironborn' WHERE username = '';

CREATE INDEX IF NOT EXISTS idx_backups_user ON backups(username, id);
