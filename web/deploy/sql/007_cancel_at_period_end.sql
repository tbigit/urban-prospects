-- 007_cancel_at_period_end.sql — mirror Stripe's cancel_at_period_end so the admin
-- and the app can see a subscription that is still active but will not renew.
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS canceled_at timestamptz;
