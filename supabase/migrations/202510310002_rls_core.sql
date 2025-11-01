-- Enable Row Level Security for core tables
alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can view self'
      and schemaname = 'public'
      and tablename = 'users'
  ) then
    create policy "Users can view self"
      on public.users
      for select
      using (auth.uid() = id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users manage their conversations'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    create policy "Users manage their conversations"
      on public.conversations
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users manage their messages'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    create policy "Users manage their messages"
      on public.messages
      using (
        auth.uid() = (
          select user_id from public.conversations
          where id = messages.conversation_id
        )
      )
      with check (
        auth.uid() = (
          select user_id from public.conversations
          where id = messages.conversation_id
        )
      );
  end if;
end
$$;
