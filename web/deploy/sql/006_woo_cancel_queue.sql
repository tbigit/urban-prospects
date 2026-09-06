-- 006_woo_cancel_queue.sql — track which WooCommerce subscriptions still need cancelling
-- after a member re-subscribes on Stripe (Pin Payments would otherwise keep billing them).
ALTER TABLE wp_import_subscriptions ADD COLUMN IF NOT EXISTS woo_cancel_due_at timestamptz;   -- set when the Stripe renewal completes
ALTER TABLE wp_import_subscriptions ADD COLUMN IF NOT EXISTS woo_cancelled_at  timestamptz;   -- set by an admin once cancelled in WooCommerce
ALTER TABLE wp_import_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id varchar(64);
