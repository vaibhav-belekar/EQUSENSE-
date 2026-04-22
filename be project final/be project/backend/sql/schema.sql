create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  full_name text,
  preferred_market text not null default 'IN' check (preferred_market in ('IN', 'US')),
  risk_profile text not null default 'balanced' check (risk_profile in ('conservative', 'balanced', 'aggressive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table if not exists public.watchlist_items (
  watchlist_id uuid not null references public.watchlists (id) on delete cascade,
  symbol text not null,
  market text not null default 'IN' check (market in ('IN', 'US')),
  added_at timestamptz not null default timezone('utc', now()),
  notes text,
  primary key (watchlist_id, symbol, market)
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  symbol text not null,
  market text not null default 'IN' check (market in ('IN', 'US')),
  investment_amount numeric(14,2) not null check (investment_amount > 0),
  investment_period integer not null check (investment_period > 0),
  current_price numeric(14,4),
  predicted_price numeric(14,4),
  expected_return numeric(8,4),
  risk numeric(8,4),
  confidence numeric(8,4),
  signal text,
  recommendation text,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prediction_snapshots (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  market text not null default 'IN' check (market in ('IN', 'US')),
  model_name text not null,
  forecast_horizon_days integer not null default 10 check (forecast_horizon_days > 0),
  expected_return numeric(8,4) not null,
  risk numeric(8,4),
  confidence numeric(8,4),
  signal text,
  feature_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_watchlists_user_id on public.watchlists (user_id);
create index if not exists idx_watchlist_items_symbol_market on public.watchlist_items (symbol, market);
create index if not exists idx_analysis_runs_user_created_at on public.analysis_runs (user_id, created_at desc);
create index if not exists idx_analysis_runs_symbol_market_created_at on public.analysis_runs (symbol, market, created_at desc);
create index if not exists idx_prediction_snapshots_symbol_market_created_at on public.prediction_snapshots (symbol, market, created_at desc);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_watchlists_updated_at on public.watchlists;
create trigger trg_watchlists_updated_at
before update on public.watchlists
for each row execute function public.set_updated_at();
