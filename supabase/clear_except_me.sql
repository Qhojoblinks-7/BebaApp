-- ============================================================
-- FIND YOUR USER UUID FIRST (run this standalone):
--   SELECT id, phone, full_name FROM users;
--
-- Then replace 'REPLACE_WITH_YOUR_USER_UUID' everywhere below
-- ============================================================

BEGIN;

-- 1. Clear dependent / child rows first (FK-safe order)
DELETE FROM notifications;
DELETE FROM rider_locations    WHERE rider_id    != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM revenue            WHERE rider_id    != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM manual_entries     WHERE rider_id    != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM budget_allocations WHERE rider_id   != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM budget_items;
DELETE FROM insights           WHERE rider_id    != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM insight_actions    WHERE rider_id    != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM notification_settings WHERE rider_id != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM privacy_security_settings WHERE rider_id != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM rider_preferences  WHERE rider_id    != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM orders             WHERE rider_id    != 'REPLACE_WITH_YOUR_USER_UUID'
                                 AND customer_id != 'REPLACE_WITH_YOUR_USER_UUID';

-- 2. Remove other riders entirely but keep your account-linked records
DELETE FROM rider_status  WHERE id != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM profiles      WHERE id != 'REPLACE_WITH_YOUR_USER_UUID';
DELETE FROM users         WHERE id != 'REPLACE_WITH_YOUR_USER_UUID';

COMMIT;
