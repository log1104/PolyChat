-- Mentor registry introduced in Slice 2
create table if not exists public.mentors (
  id text primary key,
  name text not null,
  description text,
  theme jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
