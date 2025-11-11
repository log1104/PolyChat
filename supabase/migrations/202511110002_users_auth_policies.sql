-- Allow authenticated users to insert/update their own profile row in public.users
do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users insert self'
      and schemaname = 'public'
      and tablename = 'users'
  ) then
    create policy "Users insert self"
      on public.users
      for insert
      with check (auth.uid() = id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users update self'
      and schemaname = 'public'
      and tablename = 'users'
  ) then
    create policy "Users update self"
      on public.users
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end
$$;
