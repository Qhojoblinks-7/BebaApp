-- Supabase Database Schema for Beba Logistics
-- Run this in Supabase SQL Editor to set up tables

-- Users table: stores rider and customer profiles (maps to Supabase auth users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('rider', 'customer')) DEFAULT 'customer',
  rider_password TEXT, -- Pre-set password for riders (NULL for customers)
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table: alternative user metadata (used by AuthContext)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('rider', 'customer')) DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rider status table: tracks online/offline state and last known location
CREATE TABLE IF NOT EXISTS rider_status (
  id UUID PRIMARY KEY REFERENCES users(id),
  rider_status TEXT NOT NULL DEFAULT 'offline' CHECK (rider_status IN ('offline', 'online', 'in_class', 'on_route')),
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences table: defines delivery zones with polygon boundaries
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., "Mamprobi", "Circle"
  boundary JSONB NOT NULL, -- Array of [lng, lat] coordinates defining the polygon
  center_latitude DECIMAL(10,8) NOT NULL,
  center_longitude DECIMAL(11,8) NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 8, -- Fallback radius for quick checks
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence boundary points for accurate polygon checking
CREATE TABLE IF NOT EXISTS geofence_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  longitude DECIMAL(11,8) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  point_order INTEGER NOT NULL -- For polygon ordering
);

-- Orders table: main dispatch manifests
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL, -- Human-readable waybill (e.g., "BBA-8921-XP")
  customer_id UUID REFERENCES users(id),
  rider_id UUID REFERENCES users(id),
  
  -- Customer details (denormalized for quick access)
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
-- Sender details (pickup)
   sender_name TEXT NOT NULL,
   sender_phone TEXT NOT NULL,
   pickup_address TEXT NOT NULL,
   pickup_zone TEXT, -- For batch grouping
   pickup_lng DECIMAL(11,8), -- For geofencing
   pickup_lat DECIMAL(10,8), -- For geofencing
  
-- Delivery details
   delivery_address TEXT NOT NULL,
   delivery_zone TEXT NOT NULL, -- For batch grouping
   delivery_lng DECIMAL(11,8), -- For geofencing
   delivery_lat DECIMAL(10,8), -- For geofencing
  
  -- Parcel info
  item_description TEXT,
  delivery_instructions TEXT,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  base_price DECIMAL(10,2),
  distance_fee DECIMAL(10,2),
  surge_fee DECIMAL(10,2),
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'pending',
  
  -- Batch optimization fields
  route_sequence INTEGER DEFAULT 0, -- 0 means not yet sequenced
  batch_id UUID, -- Optional: group orders into explicit batches
  
-- Delivery confirmation
   received_by TEXT, -- Name of person who received
   received_at TIMESTAMPTZ,
   delivery_pin TEXT, -- 4-digit PIN for delivery verification
   signature TEXT, -- Base64 encoded signature
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rider locations table: for real-time tracking
CREATE TABLE IF NOT EXISTS rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  accuracy DECIMAL(5,2), -- meters
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue table: track earnings per rider
CREATE TABLE IF NOT EXISTS revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(10,2) NOT NULL,
  order_completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table: for rider order alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  rider_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Point-in-polygon function for geofence checking
-- Uses ray casting algorithm
CREATE OR REPLACE FUNCTION point_in_polygon(lon DECIMAL, lat DECIMAL, polygon_lnglat JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  points JSONB[] := polygon_lnglat;
  n INTEGER := jsonb_array_length(polygon_lnglat);
  inside BOOLEAN := false;
  p1 JSONB;
  p2 JSONB;
  i INTEGER := 1;
  j INTEGER;
BEGIN
  i := n;
  FOR j IN 1..n LOOP
    p1 := points[i];
    p2 := points[j];
    
    IF (jsonb_extract_path_text(p1::jsonb, '1')::DECIMAL < lat) <> (jsonb_extract_path_text(p2::jsonb, '1')::DECIMAL < lat) THEN
      IF lon < (jsonb_extract_path_text(p2::jsonb, '0')::DECIMAL - jsonb_extract_path_text(p1::jsonb, '0')::DECIMAL) * (lat - jsonb_extract_path_text(p1::jsonb, '1')::DECIMAL) / 
         (jsonb_extract_path_text(p2::jsonb, '1')::DECIMAL - jsonb_extract_path_text(p1::jsonb, '1')::DECIMAL) + jsonb_extract_path_text(p1::jsonb, '0')::DECIMAL THEN
        inside := NOT inside;
      END IF;
    END IF;
    i := j;
  END LOOP;
  RETURN inside;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Geofence check function - determines which geofence a point belongs to
CREATE OR REPLACE FUNCTION check_point_geofence(lat DECIMAL, lon DECIMAL)
RETURNS TABLE(geofence_name TEXT, distance_km NUMERIC) AS $$
DECLARE
  g RECORD;
BEGIN
  FOR g IN 
    SELECT name, center_latitude, center_longitude, boundary, radius_km 
    FROM geofences 
    WHERE is_active = true
  LOOP
    -- First check radius (fast)
    IF (point(lat, lon) <-> point(g.center_latitude, g.center_longitude)) * 111.32 <= g.radius_km THEN
      RETURN QUERY SELECT 
        g.name as geofence_name,
        (ROUND(point(lat, lon) <-> point(g.center_latitude, g.center_longitude) * 111.32))::NUMERIC as distance_km;
    END IF;
  END LOOP;
  RETURN;
END;
$$ language 'plpgsql';

-- Insert trigger to send notifications to all riders when order is created
CREATE OR REPLACE FUNCTION notify_riders_new_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (order_id, rider_id, title, body)
  SELECT 
    NEW.id,
    rs.id,
    'New Order Available',
    'Order ' || NEW.order_id || ' needs pickup from ' || NEW.pickup_address
  FROM rider_status rs;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS new_order_notification ON orders;

CREATE TRIGGER new_order_notification 
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE PROCEDURE notify_riders_new_order();

-- Note: WhatsApp webhooks must be configured in Supabase Dashboard under Database → Webhooks
-- - CREATE webhook: orders INSERT → whatsapp-notify
-- - UPDATE webhook: orders UPDATE → whatsapp-notify
-- The function supabase/functions/whatsapp-notify/index.ts handles customer notifications

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_rider ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_zone ON orders(delivery_zone);
CREATE INDEX IF NOT EXISTS idx_orders_route_sequence ON orders(route_sequence);
CREATE INDEX IF NOT EXISTS idx_rider_locations_rider ON rider_locations(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_locations_updated ON rider_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_notifications_rider ON notifications(rider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_timestamp ON budget_allocations;

CREATE TRIGGER update_budget_timestamp BEFORE UPDATE ON budget_allocations
  FOR EACH ROW EXECUTE PROCEDURE update_budget_updated_at();

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Riders can insert their own profile" ON users;
CREATE POLICY "Riders can insert their own profile" ON users
  FOR INSERT WITH CHECK (true);

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- Rider status policies
DROP POLICY IF EXISTS "Anyone can view rider status" ON rider_status;
CREATE POLICY "Anyone can view rider status" ON rider_status
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Riders can manage their status" ON rider_status;
CREATE POLICY "Riders can manage their status" ON rider_status
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Riders can insert their status" ON rider_status;
CREATE POLICY "Riders can insert their status" ON rider_status
  FOR INSERT WITH CHECK (true);

-- Orders policies
DROP POLICY IF EXISTS "Anyone can view orders by waybill" ON orders;
CREATE POLICY "Anyone can view orders by waybill" ON orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers can view their orders" ON orders;
CREATE POLICY "Customers can view their orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Riders can view assigned orders" ON orders;
CREATE POLICY "Riders can view assigned orders" ON orders
  FOR SELECT USING (auth.uid() = rider_id OR rider_id IS NULL);

DROP POLICY IF EXISTS "Riders can update assigned orders" ON orders;
CREATE POLICY "Riders can update assigned orders" ON orders
  FOR UPDATE USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can claim pending orders" ON orders;
CREATE POLICY "Riders can claim pending orders" ON orders
  FOR UPDATE USING (auth.uid() IS NOT NULL AND status = 'pending' AND rider_id IS NULL);

DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Rider locations policies
DROP POLICY IF EXISTS "Anyone can insert location" ON rider_locations;
CREATE POLICY "Anyone can insert location" ON rider_locations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Riders can view their own location" ON rider_locations;
CREATE POLICY "Riders can view their own location" ON rider_locations
  FOR SELECT USING (auth.uid() = rider_id);

-- Revenue policies
DROP POLICY IF EXISTS "Riders can view their own revenue" ON revenue;
CREATE POLICY "Riders can view their own revenue" ON revenue
  FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can insert their own revenue" ON revenue;
CREATE POLICY "Riders can insert their own revenue" ON revenue
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

-- Notifications policies
DROP POLICY IF EXISTS "Riders can view their notifications" ON notifications;
CREATE POLICY "Riders can view their notifications" ON notifications
  FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can update their notifications" ON notifications;
CREATE POLICY "Riders can update their notifications" ON notifications
  FOR UPDATE USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Anyone can insert notifications" ON notifications;
CREATE POLICY "Anyone can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- MIGRATIONS 005-008 + MISSING APP TABLES MERGED BELOW
-- ============================================================

-- ---------- Finance & Budget Tables (migration 005) ----------

CREATE TABLE IF NOT EXISTS manual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
  category TEXT NOT NULL CHECK (category IN ('needs', 'wants', 'savings')) DEFAULT 'needs',
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('needs', 'wants', 'savings')),
  allocated_percent INT NOT NULL DEFAULT 0,
  allocated_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, category, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID REFERENCES budget_allocations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  allocated_amount DECIMAL(10,2) NOT NULL,
  spent_amount DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metric_value TEXT,
  computed_at DATE NOT NULL DEFAULT NOW()::date
);

ALTER TABLE insights
  DROP CONSTRAINT IF EXISTS unique_rider_category_period_insight;

ALTER TABLE insights
  ADD CONSTRAINT unique_rider_category_period_insight
  UNIQUE (rider_id, category, computed_at);

CREATE TABLE IF NOT EXISTS insight_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION update_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_manual_entries_rider ON manual_entries(rider_id);
CREATE INDEX IF NOT EXISTS idx_manual_entries_occurred ON manual_entries(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_rider ON budget_allocations(rider_id);
CREATE INDEX IF NOT EXISTS idx_insights_rider ON insights(rider_id);

ALTER TABLE manual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Riders can manage their manual entries" ON manual_entries;
CREATE POLICY "Riders can manage their manual entries" ON manual_entries
  FOR ALL USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can view their budget allocations" ON budget_allocations;
CREATE POLICY "Riders can view their budget allocations" ON budget_allocations
  FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can view their budget items" ON budget_items;
CREATE POLICY "Riders can view their budget items" ON budget_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budget_allocations ba
      WHERE ba.id = budget_items.allocation_id AND ba.rider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Riders can view their insights" ON insights;
CREATE POLICY "Riders can view their insights" ON insights
  FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can view their action plans" ON insight_actions;
CREATE POLICY "Riders can view their action plans" ON insight_actions
  FOR SELECT USING (auth.uid() = rider_id);

-- ---------- Notification Settings Table (migration 006) ----------

CREATE TABLE IF NOT EXISTS notification_settings (
  rider_id UUID PRIMARY KEY REFERENCES users(id),
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  vibration_enabled BOOLEAN NOT NULL DEFAULT true,
  new_jobs BOOLEAN NOT NULL DEFAULT true,
  job_updates BOOLEAN NOT NULL DEFAULT true,
  earnings_alerts BOOLEAN NOT NULL DEFAULT true,
  promotions BOOLEAN NOT NULL DEFAULT false,
  weekly_report BOOLEAN NOT NULL DEFAULT true,
  delivery_complete BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Riders can view their notification settings" ON notification_settings;
CREATE POLICY "Riders can view their notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can insert their notification settings" ON notification_settings;
CREATE POLICY "Riders can insert their notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can update their notification settings" ON notification_settings;
CREATE POLICY "Riders can update their notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = rider_id);

-- ---------- Privacy & Security Settings (referenced in PrivacySecurityScreen) ----------

CREATE TABLE IF NOT EXISTS privacy_security_settings (
  rider_id UUID PRIMARY KEY REFERENCES users(id),
  share_location BOOLEAN NOT NULL DEFAULT true,
  profile_visible BOOLEAN NOT NULL DEFAULT false,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  biometric_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Riders can view their privacy settings" ON privacy_security_settings;
CREATE POLICY "Riders can view their privacy settings" ON privacy_security_settings
  FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can insert their privacy settings" ON privacy_security_settings;
CREATE POLICY "Riders can insert their privacy settings" ON privacy_security_settings
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can update their privacy settings" ON privacy_security_settings;
CREATE POLICY "Riders can update their privacy settings" ON privacy_security_settings
  FOR UPDATE USING (auth.uid() = rider_id);

-- ---------- Rider Preferences (referenced in PreferencesScreen) ----------

CREATE TABLE IF NOT EXISTS rider_preferences (
  rider_id UUID PRIMARY KEY REFERENCES users(id),
  theme TEXT NOT NULL DEFAULT 'dark',
  language TEXT NOT NULL DEFAULT 'English',
  volume INT NOT NULL DEFAULT 80,
  default_vehicle TEXT NOT NULL DEFAULT 'Motorcycle',
  max_distance INT NOT NULL DEFAULT 15,
  auto_accept BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Riders can view their preferences" ON rider_preferences;
CREATE POLICY "Riders can view their preferences" ON rider_preferences
  FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can insert their preferences" ON rider_preferences;
CREATE POLICY "Riders can insert their preferences" ON rider_preferences
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can update their preferences" ON rider_preferences;
CREATE POLICY "Riders can update their preferences" ON rider_preferences
  FOR UPDATE USING (auth.uid() = rider_id);

-- ---------- Storage: Avatar Bucket Policies ----------
-- Assumes storage bucket named 'avatars' exists in Supabase Dashboard

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Users can view their own avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '%');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND name LIKE auth.uid()::text || '%');

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '%');

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '%');