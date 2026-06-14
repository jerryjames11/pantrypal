-- Run in Supabase SQL Editor

-- Privacy contact requests table (no auth required — public submissions)
create table if not exists privacy_requests (
  id          bigserial primary key,
  name        text not null,
  email       text not null,
  request_type text not null check (request_type in ('access','delete','correct','export','other')),
  message     text not null,
  status      text default 'pending' check (status in ('pending','in_progress','resolved')),
  created_at  timestamptz default now()
);

-- No RLS — submissions are anonymous (not linked to auth users)
-- You access this table via Supabase dashboard directly
