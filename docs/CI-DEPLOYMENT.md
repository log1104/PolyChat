CI-based Deployment (Supabase + Vercel)

Overview

This repo includes GitHub Actions workflows to deploy:
- Supabase: database migrations and Edge Functions
- Web app to Vercel (prebuilt)

You control secrets via GitHub repo settings and/or the Supabase dashboard.

Workflows

1) .github/workflows/supabase-deploy.yml
   Triggers on push to main (paths under supabase/**) or manual dispatch.
   Steps:
   - Authenticates Supabase CLI with SUPABASE_ACCESS_TOKEN
   - supabase db push (remote)
   - Optionally sets project secrets (if you provide them as repo secrets)
   - Deploys all functions found under supabase/functions/*
   - Smoke-tests GET https://<project-ref>.functions.supabase.co/chat/health

   Required repo secrets:
   - SUPABASE_ACCESS_TOKEN: Personal Access Token (PAT) from Supabase Dashboard → Account → Tokens
   - SUPABASE_PROJECT_REF: Your project ref (e.g., vtblibcltcvfkpdxowzw)

   Optional repo secrets (only if you prefer setting project secrets via CI):
   - OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_SITE_URL, OPENROUTER_APP_NAME
   - OPENAI_API_KEY (alternative to OpenRouter)
   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for functions; can also be set in Supabase Settings → API)
   - CHAT_LLM_TIMEOUT_MS, CHAT_RATE_LIMIT_WINDOW_SECONDS, CHAT_RATE_LIMIT_MAX_REQUESTS

   Notes:
   - You can also set secrets directly in the Supabase Dashboard instead of providing them via GitHub.
   - The default chat model is driven by the UI selector (`shared/chatModel.ts`). Set env overrides only if you need different API hosts/keys.

2) .github/workflows/vercel-deploy.yml
   Triggers on push to main (web-related paths) or manual dispatch.
   Builds apps/web with Vite and deploys the prebuilt output using the official Vercel action.

   Required repo secrets:
   - VERCEL_TOKEN: Vercel token for GitHub Action
   - VERCEL_ORG_ID: Vercel organization ID
   - VERCEL_PROJECT_ID: Vercel project ID

   Build-time env (repo secrets mapped to Vite env):
   - VITE_API_BASE_URL: e.g., https://<project-ref>.functions.supabase.co
   - VITE_SUPABASE_ANON_KEY: Supabase anon/public key (Settings → API)

   Tip: You can alternatively rely on Vercel GitHub Integration and set env variables in the Vercel project dashboard. In that case, you may skip this GitHub Action entirely.

How to add repo secrets

1) GitHub → Your repo → Settings → Secrets and variables → Actions → New repository secret
2) Add each required key/value listed above.

Supabase secrets

If you prefer setting secrets directly in your Supabase project (recommended for long-term ops):
1) Supabase Dashboard → Project → Settings → API (for SUPABASE_URL, keys)
2) Project → Settings → Secrets → Add new secret (OPENROUTER_API_KEY / OPENAI_API_KEY etc.)

Local .env for function development

Use supabase/functions/chat/.env (not committed) for local serve. See example below.
