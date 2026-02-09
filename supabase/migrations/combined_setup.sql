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

-- Enable RLS
alter table gov_yield_curve enable row level security;
alter table interbank_rates enable row level security;
alter table gov_auction_results enable row level security;

-- Policies (Drop first to allow re-running)
drop policy if exists "Public read access" on gov_yield_curve;
create policy "Public read access" on gov_yield_curve for select using (true);

drop policy if exists "Enable insert for anon key" on gov_yield_curve;
create policy "Enable insert for anon key" on gov_yield_curve for insert with check (true);

drop policy if exists "Enable update for anon key" on gov_yield_curve;
create policy "Enable update for anon key" on gov_yield_curve for update using (true);
