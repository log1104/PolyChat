# Fix PDF Uploads: Missing Storage Bucket (uploads)

## Summary

Browser uploads to Supabase Storage are failing with HTTP 400 and the error "StorageApiError: Bucket not found" when attempting to upload PDFs. The frontend calls `supabase.storage.from("uploads").upload(...)`, which requires a Storage bucket named `uploads` to exist and allow inserts. In production, this bucket is missing (or blocked by policies), so uploads fail and downstream features like "summarise PDF" are blocked.

## Evidence

- Console/network errors observed in production:
  - 400 from `https://<project>.supabase.co/storage/v1/object/uploads/<filename>`
  - `StorageApiError: Bucket not found`
- Client code path:
  - `apps/web/src/components/MessageInput.vue` uses `supabase.storage.from("uploads").upload(...)`.
- Environment: Frontend uses the production anon key (Vercel env), so all Storage access is via the public (anon) role unless users authenticate.

## Root Cause

- The `uploads` bucket does not exist in the Supabase project, or
- The `uploads` bucket exists but row-level security (RLS) policies do not allow inserts/reads for the client role (anon/auth).

## Proposed Fix

Option A — via migration (preferred, repeatable)
- Ensure the database migration that creates the bucket and permissive policies is present and applied:
  - Migration file: `supabase/migrations/202511040001_storage_uploads_bucket.sql`
  - What it does:
    - Creates a public Storage bucket `uploads` (if not exists)
    - Adds RLS policies to:
      - allow public read on `uploads` (SELECT)
      - allow inserts to `uploads` (INSERT)
- Action:
  - Trigger CI to run the Supabase deploy workflow and apply migrations
  - Verify in Supabase Dashboard → Storage that the `uploads` bucket exists

Option B — via Supabase Dashboard (quick manual)
- Supabase Dashboard → Storage → Create Bucket
  - Name: `uploads` (must match exactly)
  - Public: ON (if you want public reads from the browser)
- Policies:
  - Add an INSERT policy on `storage.objects` restricted to `bucket_id = 'uploads'`
  - If bucket is not public, also add a SELECT policy or rely on signed URLs

## Security Considerations

- The current migration uses permissive policies (public read and public insert). This is safe only for demos or low-risk scenarios.
- For production:
  - Restrict INSERT to `authenticated` users, or
  - Use short-lived signed upload URLs from an Edge Function (service role)
  - Validate file types and size limits (e.g., only PDFs/images up to N MB)
  - Consider antivirus scanning and content moderation as needed

## Acceptance Criteria

- A Storage bucket named `uploads` exists in the production Supabase project
- Uploading a small PDF from the web app succeeds (HTTP 200)
- The uploaded object appears in Supabase Dashboard → Storage → uploads
- If bucket is public: the file is retrievable by a public URL
- If bucket is private: app can obtain a signed URL or server-side access to read/process the file

## Validation Steps

1) Deploy the migration (or create bucket/policies manually)
2) In the web app, attach a small PDF and send
3) Confirm no 400 errors; the network request to `/storage/v1/object/uploads/...` returns 200
4) Confirm object appears in the `uploads` bucket
5) Proceed to implement/verify PDF text extraction and summarisation flow (separate task)

## Rollback Plan

- If policy is too permissive, update policies to require authentication or switch to signed URLs
- If a mistaken bucket was created, delete the bucket from Dashboard (after confirming no needed data) and revert the migration in version control

## Ownership & Estimate

- Owner: Core/Platform
- Estimate: 0.5–1.0 day (including CI, verification, and any policy tightening)

## References

- Client upload code: `apps/web/src/components/MessageInput.vue`
- Migration: `supabase/migrations/202511040001_storage_uploads_bucket.sql`
- Supabase Storage docs: https://supabase.com/docs/guides/storage
- RLS policies for Storage: https://supabase.com/docs/guides/storage#policies
