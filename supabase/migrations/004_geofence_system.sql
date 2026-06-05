-- Geofence system migration
-- Adds geofences table and updates rider_status for location tracking

-- Add coordinates to rider_status for geofencing
ALTER TABLE rider_status 
ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11,8);

-- Create geofences table
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  center_latitude DECIMAL(10,8) NOT NULL,
  center_longitude DECIMAL(11,8) NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Accra geofence zones
INSERT INTO geofences (name, center_latitude, center_longitude, radius_km, is_active) VALUES
  ('Mamprobi', 5.5338, -0.2371, 8, true),
  ('Accra Central', 5.5550, -0.2000, 8, true),
  ('Circle', 5.5700, -0.2100, 8, true),
  ('Dansoman', 5.5551, -0.2725, 8, true),
  ('Kaneshi', 5.5600, -0.2200, 8, true)
ON CONFLICT (name) DO NOTHING;

-- RLS for geofences
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view geofences" ON geofences FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active);