-- 005_subscription_period_end.sql — give user_subscriptions an explicit period end so the
-- admin dashboard can show renewals/expiries. Additive: upapp/api.js inserts by column list
-- and is unaffected. Backfilled from the WordPress import (scheduled end, else next payment).
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS admin_note text;
COMMENT ON COLUMN user_subscriptions.current_period_end IS 'Stripe current_period_end once on Stripe; for WP imports the Woo scheduled end or next payment date.';

UPDATE user_subscriptions s
   SET current_period_end = COALESCE(w.end_at, w.next_payment_at)
  FROM wp_import_subscriptions w
 WHERE w.user_subscriptions_id = s.id AND s.current_period_end IS NULL;

CREATE OR REPLACE FUNCTION user_subscriptions_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION user_subscriptions_set_updated_at();
