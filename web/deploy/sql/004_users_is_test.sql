-- 004_users_is_test.sql — flag staff, agency and dummy accounts so they are excluded from
-- customer counts, billing and marketing. Login still works for them (Stuart is one).
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN users.is_test IS 'Internal/test account (staff, dev agency, dummy). Exclude from customer reporting and billing.';
UPDATE users SET is_test = true WHERE lower(email) IN (
  'dev2@imtg.com.au','info+mak@imtg.com.au','kheradmandi.m@gmail.com','mary@urbanperspectives.com.au',
  'stuart@urbanperspectives.com.au','testmail+ariane@imtg.com.au',
  'testmail+imtg2@imtg.com.au','testmail4@imtg.com.au','tony@urbanperspectives.com.au','wassef@urbanperspectives.com.au');
