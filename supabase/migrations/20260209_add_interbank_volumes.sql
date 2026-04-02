-- Migration: Add volume columns to interbank_rates table for SBV data
-- Date: 2026-02-09
-- Purpose: Support transaction volume data from State Bank of Vietnam

-- Add volume columns for each tenor
ALTER TABLE interbank_rates 
ADD COLUMN IF NOT EXISTS on_volume DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS w1_volume DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS w2_volume DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS m1_volume DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS m3_volume DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS m6_volume DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS m9_volume DOUBLE PRECISION;

-- Add comment for documentation
COMMENT ON COLUMN interbank_rates.on_volume IS 'Transaction volume for Overnight tenor (Billion VND)';
COMMENT ON COLUMN interbank_rates.w1_volume IS 'Transaction volume for 1 Week tenor (Billion VND)';
COMMENT ON COLUMN interbank_rates.w2_volume IS 'Transaction volume for 2 Weeks tenor (Billion VND)';
COMMENT ON COLUMN interbank_rates.m1_volume IS 'Transaction volume for 1 Month tenor (Billion VND)';
COMMENT ON COLUMN interbank_rates.m3_volume IS 'Transaction volume for 3 Months tenor (Billion VND)';
COMMENT ON COLUMN interbank_rates.m6_volume IS 'Transaction volume for 6 Months tenor (Billion VND)';
COMMENT ON COLUMN interbank_rates.m9_volume IS 'Transaction volume for 9 Months tenor (Billion VND)';

-- Create index for faster queries by date and source
CREATE INDEX IF NOT EXISTS idx_interbank_rates_date_source ON interbank_rates(date DESC, source);
