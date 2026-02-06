-- Create table for storing user chart configurations
CREATE TABLE IF NOT EXISTS user_chart_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    chart_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('year', 'quarter')),
    chart_instances JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_chart_configs_user_id ON user_chart_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chart_configs_symbol ON user_chart_configs(symbol);

-- Enable Row Level Security
ALTER TABLE user_chart_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own configs
CREATE POLICY "Users can view own chart configs"
    ON user_chart_configs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chart configs"
    ON user_chart_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chart configs"
    ON user_chart_configs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chart configs"
    ON user_chart_configs FOR DELETE
    USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_chart_configs_updated_at
    BEFORE UPDATE ON user_chart_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
