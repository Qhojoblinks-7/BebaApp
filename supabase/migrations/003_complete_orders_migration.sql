-- Complete orders table migration
-- Adds all missing columns from the updated schema

-- Add pricing columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_fee DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS surge_fee DECIMAL(10,2);

-- Add security columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_pin TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signature TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_delivery_pin ON orders(delivery_pin) WHERE delivery_pin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_signature ON orders(id) WHERE signature IS NOT NULL;

-- Verify all columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('base_price', 'distance_fee', 'surge_fee', 'delivery_pin', 'signature')
ORDER BY column_name;