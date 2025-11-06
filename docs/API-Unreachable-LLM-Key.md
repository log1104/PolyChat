# API Unreachable Incident — Missing LLM Key

## Summary
- **Date**: 2025-11-05
- **Symptom**: Frontend reports "API unreachable" when sending chat messages.
- **Root cause**: The `chat` Edge Function failed because no model provider key (`OPENROUTER_API_KEY` or `OPENAI_API_KEY`) was present in the runtime environment.
- **Why rollback is unnecessary**: All code and database migrations work as expected; the outage stems solely from a missing secret. Restoring the key returns the system to yesterday's working state.

## Evidence
- `supabase status` shows the local stack healthy (API at `http://127.0.0.1:54321`).
- Health probe: `curl -i http://127.0.0.1:54321/functions/v1/chat/health` → `HTTP 200`.
- POST to `/functions/v1/chat` returns `500` with message `"LLM provider key is not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY."`
- Vite dev server reachable (`Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173 -Method Head` → `200`).
- Database reset via `supabase db reset --local` confirms all migrations (users, conversations, uploads bucket) apply cleanly.

## Resolution Steps
1. Supply an LLM key for local or production environments:
   - Local shell example:
     ```powershell
     $env:OPENROUTER_API_KEY = "sk-or-..."
     ```
   - Or add the key to `.env` (local) / Supabase or Vercel project secrets (production).
2. Restart the Edge Functions with required env vars:
   ```powershell
   $env:SUPABASE_URL = "http://127.0.0.1:54321"
   $env:SUPABASE_ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
   $env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
   $env:OPENROUTER_API_KEY = "sk-or-..."
   supabase functions serve chat --no-verify-jwt
   ```
3. (Optional) Serve `conversations` the same way if conversation history is needed:
   ```powershell
   supabase functions serve conversations --no-verify-jwt
   ```
4. Keep the Vite dev server running separately:
   ```powershell
   $env:VITE_SUPABASE_URL = "http://127.0.0.1:54321"
   $env:VITE_SUPABASE_ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
   pnpm --filter @polychat/web dev -- --host 127.0.0.1
   ```

## Preventive Notes
- Document required secrets in local `.env` files and CI/CD pipelines.
- When the API reports "unreachable," check Edge Function logs for missing env vars before attempting rollbacks.
- Consider adding a startup check in the function to emit a clearer error in the UI if the LLM key is absent.
