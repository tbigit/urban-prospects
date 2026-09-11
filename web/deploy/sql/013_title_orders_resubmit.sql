-- Re-submission of the Hazlett order by the collector when the first attempt never
-- completed (server restart mid-request, timeout, 5xx). Each retry uses a new order id
-- UP<id>R<n> because Hazlett never accepts a repeated order id.
SET lock_timeout = '5s';
ALTER TABLE title_orders ADD COLUMN IF NOT EXISTS submit_attempts integer NOT NULL DEFAULT 0;
