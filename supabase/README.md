# Supabase Setup

1. Install the Supabase CLI and start the local stack:
   ```bash
   supabase start
   ```
2. Apply migrations:
   ```bash
   supabase db push
   ```
3. Seed mentor data after the `mentors` table exists (Slice 2+):
   ```bash
   supabase db execute --file supabase/seeds/mentors.sql
   ```

See `Schema and Tool Specs.md` for detailed schema descriptions.
