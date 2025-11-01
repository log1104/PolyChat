# Development Setup Guide

## 1. Overview

This guide describes how to get a local development environment running for the Mentor System project. Follow the steps sequentially to ensure dependencies, environment variables, and supporting services are configured before you start implementing vertical slices.

## 2. Prerequisites

- **Node.js** ≥ 20.x (install via `fnm`, `nvm`, or official installer).
- **pnpm** ≥ 9.x (`corepack enable` enables pnpm on Node 20+).
- **Git** ≥ 2.40.
- **Supabase CLI** ≥ 1.150 (`npm install -g supabase` or standalone binary).
- **Docker Desktop** (required for local Supabase services).
- **Python 3.10+** (for optional scripting utilities).

> If your team prefers npm or yarn, update the package manager reference in this document and the root `packageManager` field accordingly.

## 3. Repository Structure

The baseline monorepo layout (created in Slice 1) is as follows:

```
PolyChat/
├─ apps/
│  ├─ web/               # Vue 3 chat frontend (Vite)
│  └─ api/               # Node/Express API or Vercel functions
├─ packages/
│  ├─ mentors/           # Shared mentor definitions and prompts
│  └─ tooling/           # SDKs/clients for external services
├─ config/
│  └─ mentors/           # JSON templates for mentor prompts
├─ scripts/              # CLI utilities (ingestion, seeding)
├─ supabase/
│  ├─ migrations/        # SQL migration files
│  ├─ seeds/             # Seed data scripts
│  └─ init/              # Local dev config (optional)
├─ docs/                 # Documentation (move Markdown docs here)
├─ .env.example          # Template with required environment variables
├─ turbo.json / nx.json  # (optional) build orchestrator config
├─ package.json          # Root scripts and workspace settings
└─ pnpm-workspace.yaml   # Workspace package definitions
```

> Adjust paths if you split the repo differently. Keep documentation in `docs/` for discoverability.

## 4. Package Manager and Scripts

- Ensure `package.json` declares `"packageManager": "pnpm@9.x"` and `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
- Common root scripts in `package.json`:

```json
{
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "dev": "pnpm run dev:api & pnpm run dev:web",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "format": "pnpm -r format"
  }
}
```

Run `pnpm install` at the root after cloning to bootstrap dependencies.  
If pnpm is not globally available and `corepack enable` is blocked, use `npx pnpm <command>` (e.g., `npx pnpm install`, `npx pnpm --filter @polychat/web dev`).

## 5. Environment Variables

1. Copy `.env.example` to `.env` at the repo root.
2. Add service-specific files:
   - `apps/web/.env.local`
   - `apps/api/.env.local`
3. Required keys (see `Schema and Tool Specs.md` for full descriptions):

```
OPENROUTER_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STOCKFISH_API_URL=http://localhost:8787
STOCKFISH_API_KEY=local-dev
FINANCE_API_BASE=https://sandbox.finance.local
FINANCE_API_KEY=
BIBLE_EMBED_MODEL=text-embedding-3-large
PORT=3000
```

> Never commit `.env*` files. Configure corresponding secrets in Vercel/Supabase for non-local environments.

## 6. Local Supabase Setup

1. Install and start Docker Desktop.
2. From the project root, initialize Supabase if not already linked:
   ```bash
   supabase init
   ```
3. Start the local stack:
   ```bash
   supabase start
   ```
   This runs Postgres, API, auth, and storage at `http://localhost:54321`.
4. Apply migrations and seeds:
   ```bash
   supabase db reset --linked --seed
   ```
   - Alternatively run `supabase db push` followed by `supabase db execute --file supabase/seeds/mentors.sql`.
5. Access the Studio UI at `http://localhost:54323` to inspect tables and verify data.

When finished, stop services with `supabase stop`.

## 7. Local Tooling Services

### 7.1 Stockfish Microservice

You can either:

- Run the lightweight local server (recommended):
  ```bash
  pnpm --filter tooling run stockfish:dev
  ```
  Expected to start on `http://localhost:8787`.

- Or spin up Docker:
  ```bash
  docker run -p 8787:8080 ghcr.io/your-org/stockfish-service:latest
  ```

Ensure `STOCKFISH_API_URL` points to the correct port.

### 7.2 Finance Indicator Service

For local development, mock the finance service:

```bash
pnpm --filter tooling run finance:mock
```

This offers deterministic responses at `http://localhost:8899`. Update `FINANCE_API_BASE` accordingly. Use real API keys only in staging/production.

### 7.3 Bible Embedding Tooling

Run the ingestion script once you have an OpenRouter key:

```bash
pnpm --filter scripts run embed:bible
```

This script:
1. Loads verse CSV from `data/bible/web.csv`.
2. Calls the embed model defined in `BIBLE_EMBED_MODEL`.
3. Inserts rows into `public.vector_verses`.

## 8. Running the Applications

### 8.1 Web Frontend

```bash
pnpm --filter web dev
```
Launches Vite dev server at `http://localhost:5173`.

### 8.2 API Gateway

```bash
pnpm --filter api dev
```
Starts the Express server on `http://localhost:3000`. The server expects Supabase and tool service env vars to be set.

### 8.3 Combined Dev Workflow

```bash
pnpm dev
```
Runs both servers concurrently (ensure your shell supports background processes).

## 9. Quality Gates

- **Linting**: `pnpm lint`
- **Unit tests**: `pnpm test`
- **Type checking**: `pnpm typecheck`
- **E2E tests** (after Slice 2): `pnpm --filter web test:e2e`
- **Database diff**: `supabase db diff --linked`

Integrate these commands into CI as described in `# Mentor System — Testing Strategy.md`.

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| Supabase containers won’t start | Restart Docker, run `supabase stop` then `supabase start --debug` |
| Stockfish service timeout | Confirm service URL, reduce depth, or restart the container |
| Missing mentor prompts | Run `pnpm --filter mentors build` to regenerate compiled JSON |
| CORS errors | Verify `.env` origin settings (`VITE_PUBLIC_API_URL`, etc.) |
| pnpm command not found | Execute `corepack enable` or `npm install -g pnpm` |

## 11. Next Steps

- Keep `.env.example` updated as new variables are introduced.
- Document new scripts or services inside this guide when future slices add capabilities (AgentKit, uploads, analytics).
- Align this guide with `Schema and Tool Specs.md` whenever migrations or data pipelines change.
