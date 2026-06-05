-- Migration: Add delivery_pin column to existing orders table
-- Run this in Supabase SQL Editor if you deployed schema before this change

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_pin TEXT;

-- Add index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_orders_delivery_pin ON orders(delivery_pin) WHERE delivery_pin IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'delivery_pin';