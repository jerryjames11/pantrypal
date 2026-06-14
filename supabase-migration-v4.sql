-- ============================================================
-- PantryPal Migration v4 — Friends, Households, Notifications
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. User profiles (username, display name)
create table if not exists profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  username      text unique,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table profiles enable row level security;
create policy "Public read profiles" on profiles for select using (true);
create policy "Own profile write" on profiles for all using (auth.uid()=id) with check (auth.uid()=id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. Friendships
create table if not exists friendships (
  id          bigserial primary key,
  requester_id uuid references auth.users(id) on delete cascade not null,
  addressee_id uuid references auth.users(id) on delete cascade not null,
  status      text default 'pending' check (status in ('pending','accepted','declined')),
  created_at  timestamptz default now(),
  unique(requester_id, addressee_id)
);
alter table friendships enable row level security;
create policy "Own friendships" on friendships for all using (auth.uid()=requester_id or auth.uid()=addressee_id);

-- 3. Notifications
create table if not exists notifications (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  type        text not null, -- 'friend_request','friend_accepted','share_recipe','share_cart','household_invite'
  title       text not null,
  body        text,
  data        jsonb default '{}',
  read        boolean default false,
  created_at  timestamptz default now()
);
alter table notifications enable row level security;
create policy "Own notifications" on notifications for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists notif_user_idx on notifications(user_id, read);

-- 4. Friend shares (recipes/carts sent to friends)
create table if not exists friend_shares (
  id          bigserial primary key,
  from_user   uuid references auth.users(id) on delete cascade not null,
  to_user     uuid references auth.users(id) on delete cascade not null,
  share_type  text not null check (share_type in ('recipe','cart')),
  title       text not null,
  content     jsonb not null,
  created_at  timestamptz default now()
);
alter table friend_shares enable row level security;
create policy "Own shares" on friend_shares for all using (auth.uid()=from_user or auth.uid()=to_user);

-- 5. Households
create table if not exists households (
  id          bigserial primary key,
  name        text not null,
  owner_id    uuid references auth.users(id) on delete cascade not null,
  created_at  timestamptz default now()
);
alter table households enable row level security;
create policy "Household members read" on households for select using (
  exists (select 1 from household_members where household_id=id and user_id=auth.uid() and status='active')
  or owner_id=auth.uid()
);
create policy "Owner manage household" on households for all using (auth.uid()=owner_id) with check (auth.uid()=owner_id);

-- 6. Household members
create table if not exists household_members (
  id            bigserial primary key,
  household_id  bigint references households(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  role          text default 'member' check (role in ('owner','member')),
  status        text default 'pending' check (status in ('pending','active','left')),
  joined_at     timestamptz,
  created_at    timestamptz default now(),
  unique(household_id, user_id)
);
alter table household_members enable row level security;
create policy "Own membership" on household_members for all using (auth.uid()=user_id);
create policy "Owner manage members" on household_members for all using (
  exists (select 1 from households where id=household_id and owner_id=auth.uid())
);
create index if not exists hm_household_idx on household_members(household_id);
create index if not exists hm_user_idx on household_members(user_id);

-- 7. Add household_id to pantry_items, cart_items, receipts
alter table pantry_items add column if not exists household_id bigint references households(id) on delete cascade;
alter table cart_items   add column if not exists household_id bigint references households(id) on delete cascade;
alter table receipts     add column if not exists household_id bigint references households(id) on delete cascade;
alter table receipt_items add column if not exists household_id bigint references households(id) on delete cascade;

create index if not exists pantry_household_idx  on pantry_items(household_id);
create index if not exists cart_household_idx    on cart_items(household_id);
create index if not exists receipts_household_idx on receipts(household_id);
