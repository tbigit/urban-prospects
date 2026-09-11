-- One-off payment for title / plan / dealing searches ($25 each, Stripe Checkout).
-- payment_status: free | awaiting_payment | paid | abandoned | test_no_charge (legacy rows)
-- hazlett_status gains 'unpaid' (row exists, nothing ordered until Stripe says paid).
SET lock_timeout = '5s';   -- another session may be vacuuming; fail fast rather than queue behind it
ALTER TABLE title_orders
    ADD COLUMN IF NOT EXISTS stripe_session_id     text,
    ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
    ADD COLUMN IF NOT EXISTS amount_paid_cents     integer,
    ADD COLUMN IF NOT EXISTS paid_at               timestamptz;
CREATE INDEX IF NOT EXISTS title_orders_session_idx ON title_orders (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
