-- 003_wp_import_staging.sql — raw staging of WooCommerce Subscriptions rows imported from WordPress.
-- One row per active paid shop_subscription at migration time. Kept for audit; the
-- users and user_subscriptions rows are derived from it (data load lives outside the repo).
CREATE TABLE IF NOT EXISTS wp_import_subscriptions (
    wp_subscription_id bigint PRIMARY KEY,
    wp_user_id         bigint NOT NULL,
    user_email         varchar(255) NOT NULL,
    product_id         bigint,
    product_name       varchar(200),
    regions            text,                 -- as stored on the Woo line item ("Regions" meta), may be NULL on 2024-era subs
    billing_period     varchar(10),          -- day/month/year
    billing_interval   int,
    order_total        numeric(13,2),
    trial_end          timestamptz,
    next_payment_at    timestamptz,
    end_at             timestamptz,
    start_at           timestamptz,
    payment_method     varchar(40),          -- pin_payments or NULL (manual/comped)
    pin_customer_token varchar(64),
    wp_created_at      timestamptz,
    imported_at        timestamptz NOT NULL DEFAULT now(),
    is_test            boolean NOT NULL DEFAULT false, -- flagged by Danny 2026-09-06: staff, agency and dummy accounts
    users_id           bigint REFERENCES users(id),
    user_subscriptions_id integer REFERENCES user_subscriptions(id)
);
