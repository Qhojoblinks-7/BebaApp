-- Fix for RLS policy violation when creating orders
-- The trigger notify_riders_new_order() inserts into notifications but has no INSERT policy

-- Allow trigger to insert notifications (missing in deployed schema)
CREATE POLICY IF NOT EXISTS "Anyone can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Fix trigger to use SECURITY DEFINER so it can read rider_status and insert into notifications
ALTER FUNCTION notify_riders_new_order() SECURITY DEFINER;