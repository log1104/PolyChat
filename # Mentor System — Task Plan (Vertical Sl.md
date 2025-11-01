# Mentor System — Task Plan (Vertical Slice Roadmap)

> Strategy: Deliver value end-to-end with **six vertical slices**. Each slice must ship a working feature (UI → API → DB → Tools), be demoable, and become the baseline for the next slice.

---

## 0) Global Constraints & Conventions

- **Language/Stack:** Vue 3 + Vite + TS (Pinia for state), Node/Express (or Vercel Functions), Supabase (Postgres + Auth + Storage + Vector), OpenRouter (LLM), Cloud Run/Fly.io (tool services).
- **Branching:** `feature/slice-X-*` → `dev` (staging) → `main` (production). See `07_Version_Control_and_Branching.md`.
- **CI gates per slice:** lint, typecheck, unit, integration, E2E (smoke), schema diff, preview deploy.
- **Security:** RLS enabled by default; secrets in env only.
- **Observability:** Minimal logs in Slice 1, structured mentor/tool logs by Slice 3, traces by Slice 5.
- **Runbook:** Refer to `Schema and Tool Specs.md` for migrations, seed data, prompt templates, and external tool contracts.
- **Onboarding:** Follow `Development Setup Guide.md` for repo structure, environment setup, and local service bootstrapping.

**Definitions**
- **DoR (Definition of Ready):** Scope agreed, design sketched (UI + API), acceptance criteria defined, env vars prepared, test data ready.
- **DoD (Definition of Done):** All ACs pass; tests & CI green; docs updated; demo recorded; tagged release.

---

## SLICE 1 — Core Chat Mentor (Baseline System)

**Goal:** Ship a minimal but complete chat: UI ↔ API ↔ LLM ↔ DB. Default mentor = **Bible Mentor (LLM-only)** to start.

### Scope
- Chat UI (message list, input, send, loading state).
- `/api/chat` route calling OpenRouter (single model).
- Supabase setup (`users`, `conversations`).
- Persist messages (user ↔ assistant).
- Simple system prompt for **Bible Mentor** (no tools yet).

### Tasks
**Frontend**
 - [ ] Scaffold Vite app, Tailwind, PrimeVue (or equivalent component library).
- [ ] Components: `ChatWindow`, `MessageList`, `MessageInput`, `MentorBadge`.
 - [ ] Pinia store for session state.
- [ ] Minimal theme (neutral).

**Backend / API**
- [ ] `/api/chat` (POST): `{message, sessionId}` → LLM → `{reply}`.
- [ ] Error normalization middleware.
- [ ] Rate limit (basic).

**Database**
- [ ] `users(id, email, created_at)`.
 - [ ] `conversations(id, user_id, mentor, title, created_at)`.
 - [ ] `messages(id, conversation_id, role, content, metadata, created_at)`.
- [ ] RLS: users can only read/write own rows.

**Testing**
- [ ] Unit: chat reducers, request schema.
- [ ] Integration: POST `/api/chat` round-trip (mock LLM).
- [ ] E2E: send message, receive response, persists on reload.

**Ops**
- [ ] Vercel deploy (prod + preview).
- [ ] Supabase project link; run migrations.

### Acceptance Criteria
- User can send/receive messages.
- Messages persist and reload correctly.
- Basic error messages shown for failures.

**Risks & Mitigations**
- LLM timeout → 15s timeout + retry once.
- Schema drift → migration scripts; CI diff.

**Deliverables**
- Tag `v0.1.0`, demo GIF, updated docs (Overview, User Guide).

---

## SLICE 2 — Multi-Mentor Routing (Planner + Modular Agents)

**Goal:** Introduce **PlannerAgent** and modular **Mentor** registry (General, Bible, Chess, Stock — still LLM-only responses).

### Scope
- Intent detection (keyword + simple embeddings).
- `mentors.json` (name, icon, theme, prompt).
- UI shows active mentor badge and color.
- Store mentor in `conversations.mentor`.

### Tasks
**Frontend**
- [ ] Mentor selector (manual override + auto mode).
- [ ] Context bar showing active mentor.

**Backend**
- [ ] `PlannerAgent.classify(message): mentorId`.
- [ ] Mentor loader: system prompt templates per mentor.
- [ ] `/api/chat` chooses mentor via Planner, injects system prompt.

**Database**
- [ ] Extend `conversations.mentor` (enum text).
- [ ] Seed data for testing.

**Testing**
- [ ] Unit: planner classification table tests.
- [ ] Integration: routes to correct prompt.
- [ ] E2E: UI shows context switch; manual override respected.

**Ops**
- [ ] Feature flags: `AUTO_ROUTE=true`.

### Acceptance Criteria
- ≥90% accuracy on a small labeled intent set (Bible/Chess/Stock/General).
- UI reflects active mentor (badge + theme).
- Manual override works and persists within session.

**Risks & Mitigations**
- Misrouting → allow user correction + quick mentor switch.
- Prompt injection → sanitize user content before system prompt concat.

**Deliverables**
- Tag `v0.2.0`, demo: routing scenarios, docs update (Architecture + UI).

---

## SLICE 3 — Tool Integration: Chess Mentor ↔ Stockfish API

**Goal:** First external tool integration. Chess Mentor calls **Stockfish API** (host a stable public endpoint or use third-party demo).

### Scope
- `/api/tools/chess/analyze` proxy.
- FEN validation and error messages.
- Chess Mentor composes: FEN → Stockfish → interpret → reply.

### Tasks
**Frontend**
- [ ] FEN input helper (paste/validate).
- [ ] Simple board preview (optional for slice 3; image upload comes later).

**Backend**
- [ ] Stockfish client (`fetch` with timeout, configurable depth).
- [ ] ChessMentor: call client, parse `bestmove`, craft explanation.

**Database**
- [ ] `mentor_logs(id, mentor, tool, request_json, response_json, ts)`.
- [ ] Log Stockfish calls with latency.

**Testing**
- [ ] Unit: FEN validator, parser of `bestmove`.
- [ ] Integration: mock Stockfish server; timeout path.
- [ ] E2E: FEN → best move shown in UI with explanation.

**Ops**
- [ ] ENV: `STOCKFISH_API_URL`, `CHESS_DEPTH`.
- [ ] Alert on tool error rate > 5%.

### Acceptance Criteria
- Given valid FEN, response within 2s (depth=10–12).
- Friendly error on invalid FEN or tool timeout.
- `mentor_logs` records request/response and duration.

**Risks & Mitigations**
- Public endpoint instability → fallback to local Docker during tests; retries.
- Latency spikes → cap depth; queue if needed.

**Deliverables**
- Tag `v0.3.0`, demo video (live FEN analysis), docs for tool integration.

---

## SLICE 4 — Knowledge-Grounded Mentors (Bible Vector + Stock Indicators)

**Goal:** Add **RAG** for Bible; add **Stock Mentor** with indicators (RSI/MACD) from Twelve Data / Alpha Vantage.

### Scope
- Supabase vector table for verses & cross-refs.
- `GET /api/tools/stock/indicators?symbol=AAPL&period=1mo` (cache 60s).
- BibleMentor: semantic search → cite verses; StockMentor: fetch → interpret.

### Tasks
**Data**
- [ ] Prepare Bible corpus, embeddings (OpenAI or local).
- [ ] `vector_verses(id, book, chap, verse, text, embedding)`.

**Backend**
- [ ] `/api/tools/bible/search`: semantic top-k + metadata.
- [ ] `/api/tools/stock/indicators`: RSI/MACD/MA; provider client; basic cache.
- [ ] StockMentor explanation templates (no financial advice disclaimer).

**Frontend**
- [ ] Verse results card with refs; copy buttons.
- [ ] Indicator mini-cards (RSI gauge value, MACD).

**Testing**
- [ ] Unit: embedding query wrapper; indicator math sanity checks.
- [ ] Integration: stock provider mock; vector search returns expected references.
- [ ] E2E: “AAPL RSI” shows number; “purity of mind” returns relevant verses.

**Ops**
- [ ] ENV keys: `ALPHA_VANTAGE_KEY`/`TWELVE_DATA_KEY`.
- [ ] Rate-limit middleware, in-memory cache.

### Acceptance Criteria
- Bible queries return ≥2 relevant verses with references.
- Stock queries show current RSI/MACD with timestamp.
- Responses cite sources or “as of” time.

**Risks & Mitigations**
- Rate limits → cache; backoff; provider switch.
- Embedding drift → pin version & model; track changes.

**Deliverables**
- Tag `v0.4.0`, demo: Bible RAG + Stock indicators; docs updated (Data & Tools).

---

## SLICE 5 — AgentKit Orchestration + Observability & CI Hardening

**Goal:** Introduce **AgentKit** for tool graphs (optional fallback if immature), add **tracing**, improve CI/CD.

### Scope
- Agent graph: Planner → Mentor → Tool → Summarize.
- Trace viewer (AgentKit or Langfuse) link in developer mode.
- CI: Playwright on staging; schema diff; preview comments.

### Tasks
**Backend/Agents**
- [ ] Wrap mentor pipeline as AgentKit nodes (or keep internal orchestrator if AgentKit not stable).
- [ ] Tracing hooks: capture tool calls, timings, outcomes.

**Frontend**
- [ ] Developer toggle: show traces (IDs, durations).
- [ ] Error surfaces with retry & trace ID.

**CI/CD & Ops**
- [ ] GitHub Actions: split jobs (unit/integration/e2e).
- [ ] Sentry + Logflare/Axiom streams; alerts on p95 latency.

**Testing**
- [ ] Integration: multi-step path with trace assertions.
- [ ] E2E: failure path shows trace ID & retry works.

### Acceptance Criteria
- Each mentor execution generates a trace with at least: planner_decision, tool_calls[], latencies.
- Staging E2E runs on every `dev` merge.
- Alert fires when error rate > 3% for 10 min.

**Risks & Mitigations**
- AgentKit API churn → adapter interface; feature flag `USE_AGENTKIT`.
- Cost creep → sampling traces; limit depth.

**Deliverables**
- Tag `v0.5.0`, demo: trace walkthrough; docs: “Observability & Orchestration”.

---

## SLICE 6 — Personalization, File/Image Uploads, Context-Aware UI

**Goal:** Rich UX & personalization. Image/file uploads route contextually; mentor icons & themes adapt; user memory.

### Scope
- Authenticated user profile: preferences (mentor defaults, level).
- Uploads: images (chess board), docs (Bible/stock) with context detection.
- Automatic mentor switching on upload.
- User dashboard: sessions, favorites.

### Tasks
**Frontend**
- [ ] Upload controls (📎/🖼️), preview modal, progress states.
- [ ] Dynamic theme system per mentor (tokens).
- [ ] Dashboard page (history, filters).

**Backend**
- [ ] `/api/uploads` → Supabase Storage; type sniff; context detection.
- [ ] Optional: chess board image → FEN extractor hook (pluggable; can defer to v1.1).

**Database**
- [ ] `uploads(id, user_id, url, type, detected_context, ts)`.
- [ ] `user_profiles(id, preferences jsonb)`.

**Testing**
- [ ] Integration: upload → context route; access control on files.
- [ ] E2E: upload chess image → Chess Mentor auto-active; upload PDF → relevant mentor.

**Ops**
- [ ] File scanning stub; size limits; signed URLs.
- [ ] Cleanup job for stale uploads.

### Acceptance Criteria
- Uploading a chess image toggles Chess mentor & processes context (or prompts for FEN if extractor not enabled).
- User sees personalized sessions and last mentor used.
- Theme and icon always reflect active mentor.

**Risks & Mitigations**
- Image parsing complexity → phased: start with manual FEN; flag OCR/FEN later.
- Storage abuse → auth required for uploads; quotas; cleanup.

**Deliverables**
- Tag `v1.0.0`, demo: end-to-end personalized flow; docs updated (User Guide + UI Design).

---

## Cross-Slice Workstreams

**A) Security & Privacy**
- [ ] Enforce RLS on all tables.
- [ ] CORS to trusted origins.
- [ ] Secrets management in Vercel/Supabase dashboards.
- [ ] PII minimization in logs.

**B) Performance**
- [ ] Target: `/api/chat` p95 < 1200ms (no external tools).
- [ ] Stockfish depth capped (default 12).
- [ ] Indicator endpoints cached 60–120s.

**C) Analytics**
- [ ] Minimal mentor usage metrics (slice 4).
- [ ] Tool error/latency dashboards (slice 5).

---

## Timeline (Suggestive)

| Slice | Window | Milestone |
|------:|--------|-----------|
| 1 | Wk 1–2 | Core chat + DB |
| 2 | Wk 3–4 | Routing + mentors |
| 3 | Wk 5–6 | Chess tool |
| 4 | Wk 7–8 | Bible RAG + Stock |
| 5 | Wk 9–10 | Orchestration + tracing |
| 6 | Wk 11–12 | Personalization + uploads |

---

## Success Metrics (Per Release)

- **Reliability:** Error rate < 2% (app); < 5% (tools) with retry.
- **Latency:** p95 chat < 1200ms (no tools); p95 tool calls documented.
- **Accuracy:** Slice 2 intent accuracy ≥ 90%; Slice 4 Bible top-2 relevance ≥ 70% (manual eval set).
- **UX:** Task completion rate ≥ 80% in smoke tests (E2E).
- **Observability:** 100% requests have trace IDs by Slice 5.

---

## Sample Ticket Backlog (Slice 3 exemplar)

- `feat(chess): add FEN validator and UI helper`
- `feat(chess): implement /api/tools/chess/analyze proxy`
- `feat(chess): chessMentor integrate Stockfish client with timeout`
- `chore(db): create mentor_logs table + RLS`
- `test(int): mock Stockfish and assert bestmove flow`
- `test(e2e): FEN → best move acceptance`
- `docs: update Technical Architecture (tool integration)`
- `ops: add STOCKFISH_API_URL to envs and secrets`

---

## Checklists

**Definition of Ready (per slice)**
- [ ] Goals & ACs agreed
- [ ] Wireframes/API contracts sketched
- [ ] Env vars listed
- [ ] Test data prepared
- [ ] Risks logged with mitigations

**Definition of Done (per slice)**
- [ ] All ACs pass
- [ ] Unit/Integration/E2E green in CI
- [ ] Docs updated (Overview/User Guide/Tech/UI)
- [ ] Demo video or GIF recorded
- [ ] Release tag created

---

## Dependencies Matrix

| Dep | Needed By | Notes |
|-----|-----------|------|
| Supabase project | Slice 1 → | Migrations & RLS |
| OpenRouter key | Slice 1 → | LLM calls |
| Stockfish API URL | Slice 3 → | Tool integration |
| Finance API key | Slice 4 → | Indicators |
| Vector embeddings | Slice 4 → | Bible RAG |
| Tracing backend | Slice 5 → | AgentKit or Langfuse |
| Storage bucket | Slice 6 → | Uploads |

---

## Risk Register (Top Five)

1. **External tool instability** (Stockfish / finance APIs)  
   - *Mitigation:* retries, caching, fallback messages, health checks.

2. **Intent misclassification**  
   - *Mitigation:* manual override; continual training set; thresholding.

3. **Rate limits / cost spikes**  
   - *Mitigation:* cache, batching, low-cost models for non-critical steps.

4. **AgentKit API changes**  
   - *Mitigation:* adapter layer + feature flag; keep internal orchestrator.

5. **Data privacy**  
   - *Mitigation:* strict RLS; redact logs; signed URLs for Storage.

---

## Handover Artifacts (per slice)

- Demo link / video
- Release notes
- Updated `/docs` (relevant files)
- Test report (coverage + E2E summary)
- Env var list diffs
- Known issues & next steps

---

*This task plan is the execution blueprint for Mentor System delivery.  
Every slice must be vertically complete, observable, and demonstrably useful before moving on.*
