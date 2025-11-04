# Web CI/Deployment

This app is deployed via GitHub Actions (see `.github/workflows/vercel-deploy.yml`) or via Vercel GitHub Integration.

Build-time env required for the Vercel Action:
- `VITE_API_BASE_URL` (e.g., `https://<project-ref>.functions.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` (from Supabase Settings → API)

See `docs/CI-DEPLOYMENT.md` for details.
