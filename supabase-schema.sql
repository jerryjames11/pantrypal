-- ============================================================
-- PantryPal Database Schema
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. Pantry items (live inventory per user)
create table pantry_items (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  qty         text default '',
  status      text default 'fresh' check (status in ('fresh','low','out')),
  last_price  numeric(10,2),          -- most recent known price
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);

-- 2. Receipt uploads (one row per scanned receipt)
create table receipts (
  id            bigserial primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  store_name    text default 'Unknown store',
  receipt_date  date,
  total_amount  numeric(10,2),
  item_count    int default 0,
  image_url     text,                 -- Supabase storage URL (optional)
  created_at    timestamptz default now()
);

-- 3. Receipt line items (items parsed from each receipt)
create table receipt_items (
  id            bigserial primary key,
  receipt_id    bigint references receipts(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  qty           text default '',
  price         numeric(10,2),        -- price on THIS receipt
  prev_price    numeric(10,2),        -- price the previous time this item appeared
  price_delta   numeric(10,2),        -- price - prev_price (positive = up, negative = down)
  created_at    timestamptz default now()
);

-- ── Row-level security ────────────────────────────────────────────────────
alter table pantry_items  enable row level security;
alter table receipts       enable row level security;
alter table receipt_items  enable row level security;

create policy "own pantry"         on pantry_items  for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own receipts"       on receipts       for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own receipt_items"  on receipt_items  for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────
create index pantry_user_idx    on pantry_items(user_id);
create index receipts_user_idx  on receipts(user_id);
create index ri_receipt_idx     on receipt_items(receipt_id);
create index ri_user_name_idx   on receipt_items(user_id, name);  -- fast prev-price lookup
