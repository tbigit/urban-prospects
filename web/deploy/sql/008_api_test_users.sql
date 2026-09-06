-- 008_api_test_users.sql — users rows for the three pre-existing API/Stripe test subscriptions
-- (user_subscriptions ids 1–3) so they carry is_test and stop showing as "no user" in /admin/.
-- No password: they cannot log in until an admin sets one.
INSERT INTO users (user_login, email, password_hash, password_algo, display_name, role, status, is_test, stripe_customer_id, created_at)
SELECT s.user_email, s.user_email, NULL, 'argon2id', 'API test — ' || split_part(s.user_email,'@',1),
       'subscriber', 'inactive', true, s.payment_customer_id, now()
FROM user_subscriptions s
WHERE s.id IN (1,2,3)
  AND NOT EXISTS (SELECT 1 FROM users u WHERE lower(u.email)=lower(s.user_email));
