-- Geofence seed data for Accra delivery zones with ACCURATE polygon boundaries
-- Run this in Supabase SQL Editor (after running schema.sql)

-- Create geofences table first
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  boundary JSONB, -- Polygon: [[lng, lat], ...]
  center_latitude DECIMAL(10,8) NOT NULL,
  center_longitude DECIMAL(11,8) NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DANSOMAN - Bounding Box Corners (closed polygon)
-- NW: 5.5645, -0.2840 | NE: 5.5680, -0.2485 | SE: 5.5395, -0.2490 | SW: 5.5320, -0.2882
INSERT INTO geofences (name, center_latitude, center_longitude, radius_km, boundary, is_active)
VALUES ('Dansoman', 5.55, -0.27, 8, 
  '[[-0.2840, 5.5645], [-0.2485, 5.5680], [-0.2490, 5.5395], [-0.2882, 5.5320], [-0.2840, 5.5645]]', true)
ON CONFLICT (name) DO UPDATE SET 
  center_latitude = EXCLUDED.center_latitude,
  center_longitude = EXCLUDED.center_longitude,
  boundary = EXCLUDED.boundary;

-- MAMPROBI - Bounding Box Corners
-- NW: 5.5482, -0.2510 | NE: 5.5460, -0.2360 | SE: 5.5265, -0.2375 | SW: 5.5290, -0.2522
INSERT INTO geofences (name, center_latitude, center_longitude, radius_km, boundary, is_active)
VALUES ('Mamprobi', 5.538, -0.244, 8, 
  '[[-0.2510, 5.5482], [-0.2360, 5.5460], [-0.2375, 5.5265], [-0.2522, 5.5290], [-0.2510, 5.5482]]', true)
ON CONFLICT (name) DO UPDATE SET 
  center_latitude = EXCLUDED.center_latitude,
  center_longitude = EXCLUDED.center_longitude,
  boundary = EXCLUDED.boundary;

-- ACCRA CENTRAL - Bounding Box Corners
-- NW: 5.5562, -0.2160 | NE: 5.5530, -0.1985 | SE: 5.5375, -0.2010 | SW: 5.5340, -0.2142
INSERT INTO geofences (name, center_latitude, center_longitude, radius_km, boundary, is_active)
VALUES ('Accra Central', 5.545, -0.207, 8, 
  '[[-0.2160, 5.5562], [-0.1985, 5.5530], [-0.2010, 5.5375], [-0.2142, 5.5340], [-0.2160, 5.5562]]', true)
ON CONFLICT (name) DO UPDATE SET 
  center_latitude = EXCLUDED.center_latitude,
  center_longitude = EXCLUDED.center_longitude,
  boundary = EXCLUDED.boundary;

-- OSU - Bounding Box Corners
-- NW: 5.5678, -0.1885 | NE: 5.5695, -0.1740 | SE: 5.5442, -0.1712 | SW: 5.5420, -0.1898
INSERT INTO geofences (name, center_latitude, center_longitude, radius_km, boundary, is_active)
VALUES ('Osu', 5.55, -0.18, 8, 
  '[[-0.1885, 5.5678], [-0.1740, 5.5695], [-0.1712, 5.5442], [-0.1898, 5.5420], [-0.1885, 5.5678]]', true)
ON CONFLICT (name) DO UPDATE SET 
  center_latitude = EXCLUDED.center_latitude,
  center_longitude = EXCLUDED.center_longitude,
  boundary = EXCLUDED.boundary;

-- RLS for geofences
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view geofences" ON geofences FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active);

-- To view boundaries:
-- SELECT name, boundary FROM geofences;