-- Store per-user per-mentor system prompt overrides
create table if not exists public.mentor_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mentor_id text not null,
  system_prompt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mentor_id)
);

create index if not exists mentor_overrides_user_idx
  on public.mentor_overrides (user_id);

alter table public.mentor_overrides enable row level security;

create policy "mentor_overrides_select_owner"
  on public.mentor_overrides
  for select using (auth.uid() = user_id);

create policy "mentor_overrides_modify_owner"
  on public.mentor_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
