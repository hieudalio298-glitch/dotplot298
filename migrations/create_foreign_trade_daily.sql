-- Tạo bảng lưu dữ liệu giao dịch khối ngoại hàng ngày
CREATE TABLE IF NOT EXISTS foreign_trade_daily (
    id            BIGSERIAL PRIMARY KEY,
    symbol        TEXT        NOT NULL,
    date          DATE        NOT NULL,
    -- Buy / Sell values (VNĐ)
    buy_val       NUMERIC,    -- fr_buy_value_total
    sell_val      NUMERIC,    -- fr_sell_value_total
    net_val       NUMERIC,    -- fr_net_value_total
    -- Buy / Sell volumes (cổ phiếu)
    buy_vol       NUMERIC,    -- fr_buy_volume_total
    sell_vol      NUMERIC,    -- fr_sell_volume_total
    net_vol       NUMERIC,    -- fr_net_volume_total
    -- Room info
    fr_room       NUMERIC,    -- fr_current_room
    fr_room_pct   NUMERIC,    -- fr_room_percentage
    -- Metadata
    fetched_at    TIMESTAMPTZ DEFAULT now(),
    -- Unique constraint: 1 row per symbol per date
    CONSTRAINT foreign_trade_daily_symbol_date UNIQUE (symbol, date)
);

-- Index để truy vấn nhanh theo symbol + date range
CREATE INDEX IF NOT EXISTS idx_ftd_symbol_date
    ON foreign_trade_daily (symbol, date DESC);

-- RLS: cho phép public read (anon key)
ALTER TABLE foreign_trade_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"
    ON foreign_trade_daily FOR SELECT
    USING (true);

CREATE POLICY "Allow service insert/upsert"
    ON foreign_trade_daily FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow service update"
    ON foreign_trade_daily FOR UPDATE
    USING (true);
