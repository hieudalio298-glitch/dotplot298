-- Fix: Add single 'volume' column instead of separate tenor-specific columns
-- The SBV scraper returns volume data per row (one row per tenor)
-- So we need a single volume column, not separate columns per tenor

ALTER TABLE interbank_rates 
ADD COLUMN IF NOT EXISTS volume NUMERIC;

COMMENT ON COLUMN interbank_rates.volume IS 'Transaction volume in billions VND for this tenor on this date';
