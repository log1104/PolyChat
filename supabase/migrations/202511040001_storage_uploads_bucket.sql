-- Create a Storage bucket named 'uploads' and permissive RLS policies
-- This enables client-side uploads from the browser using the anon key.

do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'uploads'
  ) then
    insert into storage.buckets (id, name, public)
    values ('uploads', 'uploads', true);
  end if;
end
$$;

-- Allow public (anon/auth) read access to objects in the 'uploads' bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow public read on uploads'
      and schemaname = 'storage'
      and tablename = 'objects'
  ) then
    create policy "Allow public read on uploads"
      on storage.objects
      for select
      using (bucket_id = 'uploads');
  end if;
end
$$;

-- Allow anonymous/authenticated clients to insert (upload) into 'uploads' bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow uploads to uploads bucket'
      and schemaname = 'storage'
      and tablename = 'objects'
  ) then
    create policy "Allow uploads to uploads bucket"
      on storage.objects
      for insert
      with check (bucket_id = 'uploads');
  end if;
end
$$;

-- Note: This policy set is demo-friendly and permissive. For production, consider restricting
-- insert to authenticated users only or issuing signed upload URLs from an Edge Function.
