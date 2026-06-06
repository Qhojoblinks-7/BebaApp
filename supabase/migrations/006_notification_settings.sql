-- Migration: Create notification_settings table
-- Run this in Supabase SQL Editor to enable server-side notification preferences

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

-- Allow riders to view and update their own settings
CREATE POLICY "Riders can view their notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = rider_id);

CREATE POLICY "Riders can insert their notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Riders can update their notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = rider_id);
