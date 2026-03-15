export interface Stock {
    id: number;
    symbol: string;
    name: string | null;
    full_name: string | null;
    exchange: string | null;
    sector: string | null;
    shares_outstanding: number | null;
}

export interface LatestPrice {
    id: number;
    stock_id: number;
    timestamp: string;
    price: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    ref_price: number | null;
    ceiling: number | null;
    floor: number | null;
    change: number | null;
    change_percent: number | null;
    volume: number | null;
    value: number | null;
}

export interface PriceHistory {
    id: number;
    stock_id: number;
    timestamp: string;
    price: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
}

export interface StockWithPrice extends Stock {
    latest_price: LatestPrice | null;
}

export interface WatchlistItem {
    id: number;
    user_id: string;
    stock_id: number;
    created_at: string;
    stock?: Stock;
}
export interface DashboardBoard {
    id: string;
    title: string;
    symbols: string[];
    type: "sector" | "custom";
    sector?: string;
}
