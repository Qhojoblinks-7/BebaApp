-- Migration: Add missing columns to orders table
-- Run this in Supabase SQL Editor

-- Add delivery_pin column for PIN verification
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_pin TEXT;

-- Add signature column for signature capture
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signature TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_delivery_pin ON orders(delivery_pin) WHERE delivery_pin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_signature ON orders(id) WHERE signature IS NOT NULL;

-- Verify changes
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name IN ('delivery_pin', 'signature');