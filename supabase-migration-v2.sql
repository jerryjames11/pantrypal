-- ============================================================
-- PantryPal Migration v2
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. Add category column to pantry_items
alter table pantry_items add column if not exists category text default 'Uncategorized';

-- 2. Categories table (per user, with defaults)
create table if not exists categories (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  emoji       text default '📦',
  sort_order  int default 0,
  created_at  timestamptz default now()
);
alter table categories enable row level security;
create policy "own categories" on categories for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists categories_user_idx on categories(user_id);

-- 3. Shopping cart table
create table if not exists cart_items (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  qty         text default '',
  category    text default 'Uncategorized',
  checked     boolean default false,
  source      text default 'manual',  -- 'manual', 'pantry', 'recipe'
  created_at  timestamptz default now()
);
alter table cart_items enable row level security;
create policy "own cart" on cart_items for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists cart_user_idx on cart_items(user_id);

-- 4. Saved recipes table
create table if not exists saved_recipes (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  time        text,
  description text,
  have        jsonb default '[]',
  need        jsonb default '[]',
  steps       jsonb default '[]',
  match_pct   int default 0,
  created_at  timestamptz default now()
);
alter table saved_recipes enable row level security;
create policy "own saved recipes" on saved_recipes for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists saved_recipes_user_idx on saved_recipes(user_id);
