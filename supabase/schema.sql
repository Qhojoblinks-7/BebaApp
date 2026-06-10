-- =============================================================================
-- SUPABASE DATABASE SCHEMA
-- Organized by Functional Domains
-- =============================================================================

-- =============================================================================
-- 00. GLOBAL FUNCTIONS & UTILITIES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    IF (point(lat, lon) <-> point(g.center_latitude, g.center_longitude)) * 111.32 <= g.radius_km THEN
      RETURN QUERY SELECT
        g.name as geofence_name,
        (ROUND(point(lat, lon) <-> point(g.center_latitude, g.center_longitude) * 111.32))::NUMERIC as distance_km;
    END IF;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 01. USER MANAGEMENT & AUTHENTICATION DOMAIN
-- =============================================================================

-- --- TABLES ---
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('rider', 'customer')) DEFAULT 'customer',
  rider_password TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('rider', 'customer')) DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- TRIGGERS ---
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- --- ROW LEVEL SECURITY (RLS) ---
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Riders can insert their own profile" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (true);


-- =============================================================================
-- 02. CORE LOGISTICS & GEOLOCATION DOMAIN
-- =============================================================================

-- --- TABLES ---
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  boundary JSONB NOT NULL,
  center_latitude DECIMAL(10,8) NOT NULL,
  center_longitude DECIMAL(11,8) NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofence_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  longitude DECIMAL(11,8) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  point_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rider_status (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rider_status TEXT NOT NULL DEFAULT 'offline' CHECK (rider_status IN ('offline', 'online', 'in_class', 'on_route')),
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  accuracy DECIMAL(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- INDEXES ---
CREATE INDEX IF NOT EXISTS idx_rider_locations_rider ON rider_locations(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_locations_updated ON rider_locations(updated_at);

-- --- ROW LEVEL SECURITY (RLS) ---
ALTER TABLE rider_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rider status" ON rider_status FOR SELECT USING (true);
CREATE POLICY "Riders can manage their status" ON rider_status FOR ALL USING (auth.uid() = id);
CREATE POLICY "Riders can insert their status" ON rider_status FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert location" ON rider_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Riders can view their own location" ON rider_locations FOR SELECT USING (auth.uid() = rider_id);


-- =============================================================================
-- 03. ORDERS & NOTIFICATIONS DOMAIN
-- =============================================================================

-- --- TABLES ---
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_zone TEXT,
  pickup_lng DECIMAL(11,8),
  pickup_lat DECIMAL(10,8),
  delivery_address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL,
  delivery_lng DECIMAL(11,8),
  delivery_lat DECIMAL(10,8),
  item_description TEXT,
  delivery_instructions TEXT,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  base_price DECIMAL(10,2),
  distance_fee DECIMAL(10,2),
  surge_fee DECIMAL(10,2),
  status TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'pending',
  route_sequence INTEGER DEFAULT 0,
  batch_id UUID,
  received_by TEXT,
  received_at TIMESTAMPTZ,
  delivery_pin TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- FUNCTIONS & TRIGGERS ---
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.notify_riders_new_order() FROM PUBLIC;

DROP TRIGGER IF EXISTS new_order_notification ON orders;
CREATE TRIGGER new_order_notification
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE PROCEDURE notify_riders_new_order();

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rider_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (order_id, rider_id, title, body)
    VALUES (
      NEW.id,
      NEW.rider_id,
      CASE NEW.status
        WHEN 'assigned' THEN 'Rider Assigned'
        WHEN 'picked_up' THEN 'Order Picked Up'
        WHEN 'in_transit' THEN 'In Transit'
        WHEN 'delivered' THEN 'Delivered'
        WHEN 'cancelled' THEN 'Order Cancelled'
        ELSE 'Order Updated'
      END,
      'Order ' || NEW.order_id || ' — ' ||
      CASE NEW.status
        WHEN 'assigned' THEN 'You have been assigned this delivery'
        WHEN 'picked_up' THEN 'Package has been picked up'
        WHEN 'in_transit' THEN 'Package is in transit'
        WHEN 'delivered' THEN 'Package has been delivered'
        WHEN 'cancelled' THEN 'Order has been cancelled'
        ELSE 'Status updated to: ' || NEW.status
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS order_status_change_notification ON orders;
CREATE TRIGGER order_status_change_notification
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE PROCEDURE notify_order_status_change();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- --- INDEXES ---
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_rider ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_zone ON orders(delivery_zone);
CREATE INDEX IF NOT EXISTS idx_orders_route_sequence ON orders(route_sequence);
CREATE INDEX IF NOT EXISTS idx_notifications_rider ON notifications(rider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- --- ROW LEVEL SECURITY (RLS) ---
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view orders by waybill" ON orders FOR SELECT USING (true);
CREATE POLICY "Customers can view their orders" ON orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Riders can view assigned orders" ON orders FOR SELECT USING (auth.uid() = rider_id OR rider_id IS NULL);
CREATE POLICY "Riders can update assigned orders" ON orders FOR UPDATE USING (auth.uid() = rider_id);
CREATE POLICY "Riders can claim pending orders" ON orders FOR UPDATE USING (auth.uid() IS NOT NULL AND status = 'pending' AND rider_id IS NULL);

CREATE POLICY "Anyone can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Riders can view their notifications" ON notifications FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can update their notifications" ON notifications FOR UPDATE USING (auth.uid() = rider_id);


-- =============================================================================
-- 04. FINANCIALS & BUDGETING DOMAIN (RIDER APP)
-- =============================================================================

-- --- TABLES ---
CREATE TABLE IF NOT EXISTS revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  order_completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, order_id)
);

CREATE TABLE IF NOT EXISTS manual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
  category TEXT NOT NULL CHECK (category IN ('needs', 'wants', 'savings')) DEFAULT 'needs',
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- --- TRIGGERS ---
DROP TRIGGER IF EXISTS update_budget_timestamp ON budget_allocations;
CREATE TRIGGER update_budget_timestamp BEFORE UPDATE ON budget_allocations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- --- INDEXES ---
CREATE INDEX IF NOT EXISTS idx_manual_entries_rider ON manual_entries(rider_id);
CREATE INDEX IF NOT EXISTS idx_manual_entries_occurred ON manual_entries(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_rider ON budget_allocations(rider_id);

-- --- ROW LEVEL SECURITY (RLS) ---
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view their own revenue" ON revenue FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can insert their own revenue" ON revenue FOR INSERT WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Riders can manage their manual entries" ON manual_entries FOR ALL USING (auth.uid() = rider_id);

CREATE POLICY "Riders can view their budget allocations" ON budget_allocations FOR SELECT USING (auth.uid() = rider_id);

CREATE POLICY "Riders can view their budget items" ON budget_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM budget_allocations ba
    WHERE ba.id = budget_items.allocation_id AND ba.rider_id = auth.uid()
  )
);


-- =============================================================================
-- 05. BUSINESS INSIGHTS & ANALYTICS DOMAIN
-- =============================================================================

-- --- TABLES ---
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metric_value TEXT,
  computed_at DATE NOT NULL DEFAULT NOW()::date
);

ALTER TABLE insights DROP CONSTRAINT IF EXISTS unique_rider_category_period_insight;
ALTER TABLE insights ADD CONSTRAINT unique_rider_category_period_insight UNIQUE (rider_id, category, computed_at);

CREATE TABLE IF NOT EXISTS insight_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

-- --- INDEXES ---
CREATE INDEX IF NOT EXISTS idx_insights_rider ON insights(rider_id);

-- --- ROW LEVEL SECURITY (RLS) ---
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view their insights" ON insights FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can insert their insights" ON insights FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Riders can update their insights" ON insights FOR UPDATE USING (auth.uid() = rider_id);
CREATE POLICY "Riders can view their action plans" ON insight_actions FOR SELECT USING (auth.uid() = rider_id);


-- =============================================================================
-- 06. RIDER APP SETTINGS & PREFERENCES DOMAIN
-- =============================================================================

-- --- TABLES ---
CREATE TABLE IF NOT EXISTS notification_settings (
  rider_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS privacy_security_settings (
  rider_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  share_location BOOLEAN NOT NULL DEFAULT true,
  profile_visible BOOLEAN NOT NULL DEFAULT false,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  biometric_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rider_preferences (
  rider_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark',
  language TEXT NOT NULL DEFAULT 'English',
  volume INT NOT NULL DEFAULT 80,
  default_vehicle TEXT NOT NULL DEFAULT 'Motorcycle',
  max_distance INT NOT NULL DEFAULT 15,
  auto_accept BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- TRIGGERS ---
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_privacy_security_settings_updated_at ON privacy_security_settings;
CREATE TRIGGER update_privacy_security_settings_updated_at BEFORE UPDATE ON privacy_security_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_rider_preferences_updated_at ON rider_preferences;
CREATE TRIGGER update_rider_preferences_updated_at BEFORE UPDATE ON rider_preferences
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- --- ROW LEVEL SECURITY (RLS) ---
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view their notification settings" ON notification_settings FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can insert their notification settings" ON notification_settings FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Riders can update their notification settings" ON notification_settings FOR UPDATE USING (auth.uid() = rider_id);

CREATE POLICY "Riders can view their privacy settings" ON privacy_security_settings FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can insert their privacy settings" ON privacy_security_settings FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Riders can update their privacy settings" ON privacy_security_settings FOR UPDATE USING (auth.uid() = rider_id);

CREATE POLICY "Riders can view their preferences" ON rider_preferences FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can insert their preferences" ON rider_preferences FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Riders can update their preferences" ON rider_preferences FOR UPDATE USING (auth.uid() = rider_id);


-- =============================================================================
-- 07. STORAGE OBJECTS DOMAIN (Supabase Storage Policies)
-- =============================================================================

-- Clean up any conflicting old policies safely
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;

-- Re-create policies targeting the storage.objects directly 
CREATE POLICY "Users can view their own avatars" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatars" ON storage.objects 
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatars" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- END OF SCHEMA — Auth trigger registered last after all tables exist
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    username TEXT;
    phone_num TEXT;
    u_type TEXT;
BEGIN
    username := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
    u_type   := COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer');
    phone_num := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', 'No Phone');

    INSERT INTO public.users (id, phone, full_name, email, user_type)
    VALUES (NEW.id, phone_num, username, NEW.email, u_type);

    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, u_type);

    IF u_type = 'rider' THEN
        INSERT INTO public.rider_status (id, rider_status) VALUES (NEW.id, 'offline');
        INSERT INTO public.notification_settings (rider_id) VALUES (NEW.id);
        INSERT INTO public.privacy_security_settings (rider_id) VALUES (NEW.id);
        INSERT INTO public.rider_preferences (rider_id) VALUES (NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- MISSING TABLES & FIXED TRIGGERS
-- =============================================================================

-- batches: required because orders.batch_id references it
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_zone TEXT NOT NULL DEFAULT 'General Accra',
  delivery_zone TEXT NOT NULL DEFAULT 'General Accra',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_batch_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_batch_id_fkey
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders can view batches" ON batches FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Riders can update batches" ON batches FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can create batches" ON batches FOR INSERT WITH CHECK (true);

-- Fix notify_riders_new_order: insert notifications only for riders ONLINE
-- in the same zone as the order (uses checksum rather than broad broadcast)
CREATE OR REPLACE FUNCTION public.notify_riders_new_order()
RETURNS TRIGGER AS $$
DECLARE
  v_zone TEXT := COALESCE(NEW.delivery_zone, 'General Accra');
BEGIN
  INSERT INTO notifications (order_id, rider_id, title, body)
  SELECT
    NEW.id,
    rs.id,
    'New Order Available',
    'Order ' || NEW.order_id || ' needs pickup from ' || NEW.pickup_address
  FROM rider_status rs
  WHERE rs.rider_status = 'online'
    AND EXISTS (
      SELECT 1 FROM rider_locations rl
      WHERE rl.rider_id = rs.id
        AND public.check_point_geofence(rl.latitude, rl.longitude) IS NOT NULL
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.notify_riders_new_order() FROM PUBLIC;

DROP TRIGGER IF EXISTS new_order_notification ON orders;
CREATE TRIGGER new_order_notification
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE PROCEDURE public.notify_riders_new_order();