-- Migration: Replace is_rider_online boolean with rider_status text enum
-- Statuses: offline, online, in_class, on_route

ALTER TABLE rider_status 
  DROP COLUMN IF EXISTS is_rider_online;

ALTER TABLE rider_status 
  ADD COLUMN rider_status TEXT NOT NULL DEFAULT 'offline' 
  CHECK (rider_status IN ('offline', 'online', 'in_class', 'on_route'));

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

CREATE POLICY "Public can view rider status" ON rider_status
  FOR SELECT USING (true);

-- Update trigger to only notify riders who are explicitly online
CREATE OR REPLACE FUNCTION notify_riders_new_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (order_id, rider_id, title, body)
  SELECT 
    NEW.id,
    rs.id,
    'New Order Available',
    'Order ' || NEW.order_id || ' needs pickup from ' || NEW.pickup_address
  FROM rider_status rs
  WHERE rs.rider_status = 'online';
  RETURN NEW;
END;
$$ language 'plpgsql';
