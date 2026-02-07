-- Create user_watchlists table for saving industry comparison watchlists
CREATE TABLE IF NOT EXISTS user_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    symbols TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists(user_id);

-- Enable RLS
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own watchlists" ON user_watchlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlists" ON user_watchlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists" ON user_watchlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlists" ON user_watchlists
    FOR DELETE USING (auth.uid() = user_id);
