-- Table for market-wide daily statistics (Foreign & Proprietary)
CREATE TABLE IF NOT EXISTS market_stats_daily (
    date DATE NOT NULL,
    category TEXT NOT NULL, -- 'foreign', 'prop'
    index_symbol TEXT NOT NULL, -- 'VNINDEX', 'VN30', 'HNX', 'UPCOM'
    buy_value NUMERIC,
    sell_value NUMERIC,
    net_value NUMERIC,
    buy_volume NUMERIC,
    sell_volume NUMERIC,
    net_volume NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (date, category, index_symbol)
);

-- Table for per-ticker daily market statistics
CREATE TABLE IF NOT EXISTS ticker_market_stats_daily (
    date DATE NOT NULL,
    symbol TEXT NOT NULL,
    category TEXT NOT NULL, -- 'foreign', 'prop'
    buy_value NUMERIC,
    sell_value NUMERIC,
    net_value NUMERIC,
    buy_volume NUMERIC,
    sell_volume NUMERIC,
    net_volume NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (date, symbol, category)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_stats_date ON market_stats_daily(date);
CREATE INDEX IF NOT EXISTS idx_ticker_stats_date ON ticker_market_stats_daily(date);
CREATE INDEX IF NOT EXISTS idx_ticker_stats_symbol ON ticker_market_stats_daily(symbol);
