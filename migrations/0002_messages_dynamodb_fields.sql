-- Expand messages to preserve DynamoDB export fields.
-- Existing columns: id, name, email, message, created_at

ALTER TABLE messages ADD COLUMN pk TEXT DEFAULT 'message';
ALTER TABLE messages ADD COLUMN sk TEXT;
ALTER TABLE messages ADD COLUMN approved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN origin TEXT;
ALTER TABLE messages ADD COLUMN referer TEXT;
ALTER TABLE messages ADD COLUMN source_ip TEXT;
ALTER TABLE messages ADD COLUMN user_agent TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sk ON messages(sk);
CREATE INDEX IF NOT EXISTS idx_messages_approved_created_at
  ON messages(approved, created_at DESC);
