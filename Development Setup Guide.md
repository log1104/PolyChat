# Development Setup Guide

## 1. Overview

Use this guide to bootstrap a local environment for the Mentor System. The steps walk through prerequisites, repository layout, environment variables, Supabase setup, and daily developer workflows.

## 2. Prerequisites

- **Node.js** ≥ 20.x (via `fnm`, `nvm`, or the official installer)
- **pnpm** ≥ 10.x (`corepack enable` or install from https://pnpm.io/installation)
- **Git** ≥ 2.40
- **Supabase CLI** ≥ 1.150 (install with Scoop or download binary)
- **Docker Desktop** (local Supabase services)
- **Python 3.10+** (utility scripts)

## 3. Repository Structure

```
PolyChat/
├─ apps/
│  ├─ web/           # Vue 3 chat frontend (Vite)
│  └─ api/           # Optional Express gateway (local use only)
├─ packages/
│  ├─ mentors/       # Shared mentor definitions and prompt loaders
│  └─ tooling/       # Tool client helpers (Stockfish, finance APIs, etc.)
├─ config/mentors/   # JSON prompt templates
├─ design/           # UI tokens and assets
├─ scripts/          # CLI utilities (embedding, seeding)
├─ supabase/
│  ├─ migrations/    # SQL schema migrations
│  ├─ seeds/         # Seed scripts (e.g., mentor registry)
│  └─ functions/     # Supabase Edge Functions (chat API)
├─ docs/             # Markdown documentation hub
├─ .env.example      # Root environment template
├─ package.json      # Workspace scripts and metadata
├─ pnpm-workspace.yaml
└─ vercel.json
```

## 4. Package Manager & Scripts

- `package.json` declares `"packageManager": "pnpm@10.x"`
- Workspaces defined for `apps/*`, `packages/*`, `scripts`

Useful root scripts:

```json
{
  "scripts": {
    "dev": "pnpm run -r --parallel dev --filter @polychat/api --filter @polychat/web",
    "dev:web": "pnpm --filter @polychat/web dev",
    "dev:api": "pnpm --filter @polychat/api dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test"
  }
}
```

Run `pnpm install` at the root after cloning. If pnpm is not globally available, use `npx pnpm <command>`.

## 5. Environment Variables

Environment variables are split per-package for better isolation in the monorepo:

### 5.1 Root .env (Shared/Optional)
- Copy `.env.example` → `.env` (if needed for shared vars; currently empty).
- No secrets here—only placeholders or shared non-sensitive vars.

### 5.2 Web App (apps/web/.env.local)
- Copy `apps/web/.env.example` → `apps/web/.env.local`.
- Populate frontend-specific vars:
  ```
  VITE_API_BASE_URL=http://127.0.0.1:3000/api
  VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
  ```
- Restart Vite after changes (`pnpm --filter @polychat/web dev`).

### 5.3 API Server (apps/api/.env)
- Copy `apps/api/.env.example` → `apps/api/.env`.
- Populate server secrets:
  ```
  SUPABASE_URL=http://127.0.0.1:54321
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
  ```
- Optional: `PORT=3000` (defaults to 3000).

### 5.4 Other Vars (Scripts, Supabase Functions)
- For scripts or Supabase functions, use root `.env` or per-script env files.
- Supabase functions read from `.env` in the repo root when served with `--env-file .env`.

Never commit `.env*` files. In Vercel, configure vars via Project Settings.

## 6. Local Supabase Setup

1. Initialise (first run only):
   ```bash
   supabase init
   ```
2. Start services:
   ```bash
   supabase start
   ```
3. Apply migrations and seed mentors:
   ```bash
   supabase db reset
   supabase db execute --file supabase/seeds/mentors.sql
   ```
4. Studio UI accessible at `http://localhost:54323`
5. Stop services when done: `supabase stop`

## 7. Local Tool Services

### 7.1 Stockfish
- Local server: `pnpm --filter @polychat/tooling run stockfish:dev`
- Docker: `docker run -p 8787:8080 ghcr.io/your-org/stockfish-service:latest`

### 7.2 Finance Mock
- `pnpm --filter @polychat/tooling run finance:mock`

### 7.3 Bible Embed Pipeline
- `pnpm --filter scripts run embed:bible`

## 8. Running the Apps

### 8.1 Frontend
```bash
pnpm --filter @polychat/web dev
```
Launches Vite on `http://localhost:5173`.

### 8.2 Supabase Edge Function (chat API)
```bash
supabase functions serve chat --env-file .env
```
Serves the chat endpoint at `http://127.0.0.1:54321/functions/v1/chat`.

### 8.3 Optional Express Gateway
```bash
pnpm --filter @polychat/api dev
```
Useful for legacy tests; the frontend now defaults to Supabase functions.

### 8.4 Combined Workflow
```bash
pnpm dev
```
Runs frontend + Express gateway in parallel (Supabase function still recommended for API testing).

## 9. Quality Gates

- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Unit tests: `pnpm test`
- E2E (Slice 2+): `pnpm --filter @polychat/web test:e2e`
- DB diff: `supabase db diff`

## 10. Troubleshooting

| Issue | Remedy |
|-------|--------|
| Supabase containers fail to start | Restart Docker, run `supabase stop`, then `supabase start --debug` |
| Chat API CORS errors | Ensure `VITE_API_BASE_URL` matches the running function host |
| No mentor prompts | `pnpm --filter @polychat/mentors build` |
| pnpm missing | `corepack enable` or `npm install -g pnpm` |

## 11. Keep It Current

- Update `.env.example` whenever new env vars are introduced
- Document new scripts/services as slices add capabilities (AgentKit, uploads, analytics)
- Align this guide with `Schema and Tool Specs.md` after schema/tooling changes


## 12. Common Pitfalls & Lessons Learned

- Docker must be running. `supabase start` launches Docker containers; without Docker Desktop, nothing comes up and functions fail.
- Supabase CLI on PATH. If installed via Scoop, use `Set-Alias supabase "$env:USERPROFILE\scoop\apps\supabase\current\supabase.exe"` or add that path to your user PATH; admin shells may not inherit it.
- `config.toml` formatting. Use valid TOML (no BOM). After `supabase init`, keep:
  
  ```toml
  [functions]
  directory = "./functions"
  ```
  
  Earlier ad‑hoc formats or BOM markers caused parse errors.
- Use canonical env names. Edge Functions read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` exactly. Don’t prefix with `LOCAL_`.
- Vite envs are compile‑time. Frontend reads only `VITE_*` during build/dev. Put `VITE_API_BASE_URL` and `VITE_SUPABASE_ANON_KEY` in `apps/web/.env.local` (and restart Vite after changes).
- Edge auth headers. Calling a Supabase function requires `Authorization: Bearer <anon key>` and `apikey: <anon key>`. Opening the function URL directly in the browser will show “Missing authorization header”. Test with the app or curl.
- Windows line endings / BOM. Creating TOML/JSON with BOM or mixing CRLF/LF can break parsers; save as UTF‑8 without BOM when possible.
- Vercel static output. Either set project Output Directory to `apps/web/dist` or copy to root `dist/` in `vercel.json`. Commit `pnpm-lock.yaml` so Vercel uses pnpm reliably.
- ESLint v9 flat config. Use `eslint.config.js` (flat) instead of legacy `.eslintrc.*`; align TypeScript parser options or lint will fail.
- Env reload. After editing `.env` used by `supabase functions serve --env-file .env`, stop and restart the function to pick up changes.
