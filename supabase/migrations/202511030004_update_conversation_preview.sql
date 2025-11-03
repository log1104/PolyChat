alter table public.conversations
  add column if not exists preview text,
  add column if not exists last_message_at timestamptz;

update public.conversations
set last_message_at = coalesce(last_message_at, created_at);
