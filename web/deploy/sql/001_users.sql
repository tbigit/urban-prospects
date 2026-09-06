-- 001_users.sql — users table for members migrated from WordPress.
-- Target: UrbanPortalDBP (see CLAUDE.md "New platform database").
-- Passwords keep WordPress's hash verbatim so members log in without a reset.
BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id                 bigserial PRIMARY KEY,
    wp_user_id         bigint UNIQUE,                       -- wp_users.ID (NULL for users created natively)
    user_login         varchar(60)  NOT NULL,               -- wp_users.user_login
    email              varchar(255) NOT NULL,               -- wp_users.user_email; joins user_subscriptions.user_id / user_email
    password_hash      text,                                -- wp_users.user_pass verbatim: '$P$…' (phpass), '$wp$2y$…' (WP 6.8+), or '$2y$…' (bcrypt)
    password_algo      varchar(20)  NOT NULL DEFAULT 'wp_phpass'
                       CHECK (password_algo IN ('wp_phpass','wp_bcrypt','bcrypt','argon2id')),
    display_name       varchar(250),
    first_name         varchar(100),                        -- usermeta first_name
    last_name          varchar(100),                        -- usermeta last_name
    user_nicename      varchar(50),
    user_url           varchar(100),
    role               varchar(50)  NOT NULL DEFAULT 'subscriber',  -- primary WP role at migration time
    status             varchar(20)  NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive','locked')),
    stripe_customer_id varchar(64) UNIQUE,                  -- mirrors user_subscriptions.payment_customer_id
    wp_registered_at   timestamptz,                         -- wp_users.user_registered
    migrated_at        timestamptz,                         -- when the row was imported from WP
    last_login_at      timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key      ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_user_login_lower_key ON users (lower(user_login));

COMMENT ON TABLE  users IS 'Platform users. Rows with wp_user_id were migrated from WordPress wp_users; password_hash is the original WP hash so no reset is required.';
COMMENT ON COLUMN users.password_hash IS 'Verify with a phpass-compatible check for $P$/$H$ prefixes, bcrypt for $2y$; WP 6.8+ $wp$ prefix = bcrypt over sha384-base64 of the password.';
COMMENT ON COLUMN users.email IS 'Canonical join key to user_subscriptions.user_id/user_email, user_api_key, user_fav, user_search, user_template (all keyed by email).';

CREATE OR REPLACE FUNCTION users_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION users_set_updated_at();

COMMIT;
