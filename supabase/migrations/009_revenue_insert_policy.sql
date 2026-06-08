-- Migration: Add INSERT policy for revenue table
-- This fixes the issue where earnings were not being populated in the Dashboard
-- because revenue records could not be inserted when orders are delivered

-- Enable RLS on revenue table (if not already enabled)
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;

-- Allow riders to insert their own revenue records
DROP POLICY IF EXISTS "Riders can insert their own revenue" ON revenue;
CREATE POLICY "Riders can insert their own revenue" ON revenue
  FOR INSERT WITH CHECK (auth.uid() = rider_id);