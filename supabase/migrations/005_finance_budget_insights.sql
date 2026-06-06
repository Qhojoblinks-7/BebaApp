
-- Finance & budget tables
CREATE TABLE IF NOT EXISTS manual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
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
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TRIGGER update_budget_timestamp BEFORE UPDATE ON budget_allocations
  FOR EACH ROW EXECUTE PROCEDURE update_budget_updated_at();

CREATE INDEX IF NOT EXISTS idx_manual_entries_rider ON manual_entries(rider_id);
CREATE INDEX IF NOT EXISTS idx_manual_entries_occurred ON manual_entries(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_rider ON budget_allocations(rider_id);
CREATE INDEX IF NOT EXISTS idx_insights_rider ON insights(rider_id);

ALTER TABLE manual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can manage their manual entries" ON manual_entries
  FOR ALL USING (auth.uid() = rider_id);

CREATE POLICY "Riders can view their budget allocations" ON budget_allocations
  FOR SELECT USING (auth.uid() = rider_id);

CREATE POLICY "Riders can view their budget items" ON budget_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budget_allocations ba
      WHERE ba.id = budget_items.allocation_id AND ba.rider_id = auth.uid()
    )
  );

CREATE POLICY "Riders can view their insights" ON insights
  FOR SELECT USING (auth.uid() = rider_id);

CREATE POLICY "Riders can view their action plans" ON insight_actions
  FOR SELECT USING (auth.uid() = rider_id);
