-- 002_sessions.sql — login sessions and password-reset tokens for the new site.
-- Target: UrbanPortalDBP. Apply after 001_users.sql:
--   cat web/deploy/sql/002_sessions.sql | ssh root@172.105.183.89 'psql -U postgres -d UrbanPortalDBP -h 192.168.146.115'
BEGIN;

CREATE TABLE IF NOT EXISTS sessions (
    id_hash      char(64)    PRIMARY KEY,               -- sha256(cookie token); raw token is never stored
    user_id      bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    expires_at   timestamptz NOT NULL,
    ip           inet,
    user_agent   text
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash char(64)    PRIMARY KEY,
    user_id    bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used_at    timestamptz
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);

-- Housekeeping; run from cron or ad hoc. Expired rows are harmless but pile up.
CREATE OR REPLACE FUNCTION auth_purge_expired() RETURNS void LANGUAGE sql AS $$
    DELETE FROM sessions WHERE expires_at < now();
    DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '7 days';
$$;

COMMIT;
