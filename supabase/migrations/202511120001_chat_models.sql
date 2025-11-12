-- Catalog of default chat models and per-user selections
create table if not exists public.chat_model_defaults (
  model_id text primary key,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.chat_model_defaults (model_id, label, position)
values
  ('openai/gpt-4o-mini', 'OpenAI: GPT-4o Mini', 0),
  ('openai/gpt-4.1-mini', 'OpenAI: GPT-4.1 Mini', 1),
  ('openai/gpt-5-mini', 'OpenAI: GPT-5 Mini', 2),
  ('google/gemini-2.5-flash-lite', 'Google: Gemini 2.5 Flash Lite', 3),
  ('xai/grok-4-fast', 'xAI: Grok 4 Fast', 4),
  ('deepseek/deepseek-chat-v3.1:free', 'DeepSeek Chat v3.1 (Free)', 5),
  ('minimax/minimax-m2:free', 'MiniMax M2 (Free)', 6)
 on conflict (model_id)
 do update set label = excluded.label, position = excluded.position;

create index if not exists chat_model_defaults_position_idx
  on public.chat_model_defaults (position asc);

create table if not exists public.user_chat_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  model_id text not null,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, model_id)
);

create index if not exists user_chat_models_user_idx
  on public.user_chat_models (user_id, position asc);

alter table public.user_chat_models enable row level security;

drop policy if exists "user_chat_models_select" on public.user_chat_models;
drop policy if exists "user_chat_models_modify" on public.user_chat_models;

create policy "user_chat_models_select"
  on public.user_chat_models
  for select using (auth.uid() = user_id);

create policy "user_chat_models_modify"
  on public.user_chat_models
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
