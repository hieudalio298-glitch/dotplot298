-- Create user_watchlists table for Industry Comparison
CREATE TABLE IF NOT EXISTS user_watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    symbols TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON user_watchlists(user_id);

-- Enable RLS
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own watchlists"
    ON user_watchlists FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlists"
    ON user_watchlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists"
    ON user_watchlists FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists"
    ON user_watchlists FOR DELETE
    USING (auth.uid() = user_id);
