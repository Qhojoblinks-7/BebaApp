-- ========== PART 2: Budget, Insights, Settings tables ==========

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

-- ========== PART 3: Notification Settings, Privacy, Preferences ==========

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

-- ========== PART 4: Storage policies ==========

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
