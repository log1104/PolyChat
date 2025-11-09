-- Mentor configuration storage: draft/published envelopes
create table if not exists public.mentor_configs (
  id text primary key,
  draft jsonb not null,
  published jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Simple RLS: allow anon read of published via RPC later; keep disabled for now
alter table public.mentor_configs enable row level security;

-- Admin policies for service role (used by API). In Supabase, service role bypasses RLS.

