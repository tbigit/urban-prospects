-- 009_child_accounts_seats.sql — child accounts and seat counts.
-- A child account is a users row whose parent_user_id points at the member who pays;
-- its plan, regions and entitlement resolve through the parent's user_subscriptions row.
-- seats mirrors the Stripe line-item quantity (prices are per user): 1 + active children.
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id bigint REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS users_parent_user_id_idx ON users (parent_user_id) WHERE parent_user_id IS NOT NULL;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS seats integer NOT NULL DEFAULT 1;
COMMENT ON COLUMN users.parent_user_id IS 'Set on child accounts: the paying member. Entitlement and regions come from the parent''s subscription.';
COMMENT ON COLUMN user_subscriptions.seats IS 'Stripe item quantity: 1 (the member) + active child accounts.';
