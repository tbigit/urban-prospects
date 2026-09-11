-- Title / image search orders become a collection queue (docs/hazlett-api.md §8):
-- titles are ready in seconds, plan/dealing images take hours, so every order is
-- recorded, polled with backoff by the in-process collector, saved to disk and
-- emailed when the PDF arrives. Applied 2026-09-11.
ALTER TABLE title_orders
    ADD COLUMN IF NOT EXISTS document_path text,          -- file under TITLE_DOCS_DIR
    ADD COLUMN IF NOT EXISTS document_size integer,
    ADD COLUMN IF NOT EXISTS ready_at      timestamptz,   -- when the PDF was saved
    ADD COLUMN IF NOT EXISTS next_poll_at  timestamptz,   -- NULL = nothing to collect
    ADD COLUMN IF NOT EXISTS poll_attempts integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notified_at   timestamptz,   -- PDF email sent
    ADD COLUMN IF NOT EXISTS last_error    text;
-- hazlett_status values now: pending | ready | error | stale
CREATE INDEX IF NOT EXISTS title_orders_due_idx ON title_orders (next_poll_at) WHERE next_poll_at IS NOT NULL;
