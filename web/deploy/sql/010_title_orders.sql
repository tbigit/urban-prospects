-- Title search / plan image search orders placed from the app (Hazlett broker).
-- One row per identifier ordered. Replaces the WooCommerce orders for products
-- 920 (Title Search Online) and 5057 (DP/SP Search).
CREATE TABLE IF NOT EXISTS title_orders (
    id              bigserial PRIMARY KEY,
    user_id         integer REFERENCES users(id),
    user_email      text NOT NULL,
    product         text NOT NULL CHECK (product IN ('title','image')),
    identifier      text NOT NULL,           -- folio "19/7750" or dealing/plan "DP7750"
    property_address text,
    propid          text,
    price_aud       numeric(8,2) NOT NULL DEFAULT 25,
    payment_status  text NOT NULL DEFAULT 'test_no_charge', -- test_no_charge | paid | failed
    hazlett_mode    text NOT NULL,           -- mock | live
    hazlett_order_id text,
    hazlett_status  text,                    -- Closed | In Progress | error
    document_url    text,
    emailed_to      text,
    emailed_at      timestamptz,
    error           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS title_orders_user_idx ON title_orders (user_id, created_at DESC);
