# Troubleshooting Notes

## Ghost Sidebar Strip in Web App

**Symptom**: A thin vertical strip appears on the far left of the chat UI (sometimes selectable as the text fragment "will appear here"). The burger icon seems missing or misaligned.

**Cause**: The mentor drawer component remained mounted while translated off-screen, so its 80px width (and copyable content) still affected layout.

**Fix**:

- In `apps/web/src/App.vue`, only render the drawer when it is open (`v-if="isDrawerOpen"`).
- Avoid hiding the drawer solely with CSS transforms; unmount it when closed.

After applying the fix, the strip disappears and the burger toggle behaves normally.

## 2025-11-06 — Edge Function Reports "LLM provider key is not configured"

**Symptom**: API calls to `/functions/v1/chat` return HTTP 500 with the response body `{"error":true,"message":"LLM provider key is not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY."}`. In the UI, uploaded document text flashes briefly and the conversation fails to send.

**Cause**: The local Edge Function was served without loading `.env`, so the process lacked `OPENROUTER_API_KEY`. When the Supabase CLI starts the function without that variable, any LLM request fails immediately.

**Fix**:

- Use `pwsh scripts/start-local.ps1 -WithFrontend` to load `.env`, boot Supabase, and launch the chat function (the helper script was added on 2025-11-06).
- If running commands manually, load `.env` into the shell (`Get-Content .env | ForEach-Object { … Set-Item Env:... }`) before executing `supabase functions serve chat --no-verify-jwt`.
- Ensure either `OPENROUTER_API_KEY` or `OPENAI_API_KEY` is present; restart the function process after exporting the key so it picks up the new value.
