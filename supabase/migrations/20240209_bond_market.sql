-- Migration: Create Bond Market Tables
-- Based on nghiencuulaisuat DuckDB schema

-- 1. Government Bond Yield Curve
create table if not exists gov_yield_curve (
    id uuid default gen_random_uuid() primary key,
    date date not null,
    tenor_label text not null,
    tenor_days integer not null,
    spot_rate_continuous double precision,
    par_yield double precision,
    spot_rate_annual double precision,
    source text not null,
    fetched_at timestamptz default now(),
    unique(date, tenor_label, source)
);

-- 2. Interbank Rates
create table if not exists interbank_rates (
    id uuid default gen_random_uuid() primary key,
    date date not null,
    tenor_label text not null,
    rate double precision not null,
    source text not null,
    fetched_at timestamptz default now(),
    unique(date, tenor_label, source)
);

-- 3. Government Auction Results
create table if not exists gov_auction_results (
    id uuid default gen_random_uuid() primary key,
    date date not null,
    instrument_type text not null,
    tenor_label text not null,
    tenor_days integer not null,
    amount_offered double precision,
    amount_sold double precision,
    bid_to_cover double precision,
    cut_off_yield double precision,
    avg_yield double precision,
    source text not null,
    raw_file text,
    fetched_at timestamptz default now(),
    unique(date, instrument_type, tenor_label, source)
);

-- 4. Bank Rates (Deposit/Loan)
create table if not exists bank_rates (
    id uuid default gen_random_uuid() primary key,
    date date not null,
    product_group text not null check(product_group in ('deposit','loan')),
    series_code text not null,
    bank_name text not null,
    term_months integer not null default -1,
    term_label text,
    rate_min_pct double precision,
    rate_max_pct double precision,
    rate_pct double precision,
    source_url text,
    source_priority integer,
    scraped_at timestamptz,
    fetched_at timestamptz default now(),
    source text not null,
    unique(date, series_code, bank_name, term_months)
);

-- Enable RLS
alter table gov_yield_curve enable row level security;
alter table interbank_rates enable row level security;
alter table gov_auction_results enable row level security;
alter table bank_rates enable row level security;

-- Public RLS (Read-only for now, script will use service key or authenticated user)
-- For simplicity, allow authenticated users to read. Script needs Insert access.
create policy "Public read access" on gov_yield_curve for select using (true);
create policy "Public read access" on interbank_rates for select using (true);
create policy "Public read access" on gov_auction_results for select using (true);
create policy "Public read access" on bank_rates for select using (true);

-- Allow specific user (or service role) to insert? 
-- For now, allow authenticated to insert to simplify script running by user.
create policy "Auth users can insert" on gov_yield_curve for insert with check (auth.role() = 'authenticated');
create policy "Auth users can update" on gov_yield_curve for update using (auth.role() = 'authenticated');

create policy "Auth users can insert" on interbank_rates for insert with check (auth.role() = 'authenticated');
create policy "Auth users can update" on interbank_rates for update using (auth.role() = 'authenticated');

create policy "Auth users can insert" on gov_auction_results for insert with check (auth.role() = 'authenticated');
create policy "Auth users can update" on gov_auction_results for update using (auth.role() = 'authenticated');

create policy "Auth users can insert" on bank_rates for insert with check (auth.role() = 'authenticated');
create policy "Auth users can update" on bank_rates for update using (auth.role() = 'authenticated');
