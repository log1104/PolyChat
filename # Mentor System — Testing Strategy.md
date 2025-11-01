# Mentor System — Testing Strategy

## 1. Purpose

This document defines how the **Mentor System** will be tested across all layers — from UI components to mentor logic and external tool integrations.  
Testing ensures:
- Reliability across vertical slices.  
- Transparent debugging for mentor/tool failures.  
- Scalable verification during CI/CD (GitHub Actions).  

Each vertical slice (1–6) includes its own test suite before merging into `main`.

---

## 2. Testing Philosophy

The project follows a **test-as-you-slice** approach:
- Every slice delivers a functional, testable feature.  
- Tests cover the full vertical path: *UI → API → Mentor → Tool → Database*.  
- Fast unit tests run locally; heavier integration tests run in CI.  
- Mock services simulate Supabase, Stockfish, and API calls for isolation.  

---

## 3. Testing Layers Overview

| Layer | Scope | Framework / Tools |
|--------|--------|-------------------|
| **Unit Tests** | Pure functions, helpers, and mentor logic. | Vitest / Jest |
| **Integration Tests** | API routes, mentor-tool pipelines. | Supertest / Vitest |
| **End-to-End (E2E)** | Full user flows in browser context. | Playwright |
| **UI Component Tests** | Vue component rendering and state. | Testing Library (Vue) |
| **Database Tests** | Supabase schema, vector queries, RLS. | Supabase CLI / pgTAP |
| **Load & Performance** | Stockfish, API response latency. | Artillery / K6 |
| **Security & Linting** | Static analysis, type safety. | ESLint / TypeScript / Husky pre-commit |

---

## 4. Unit Testing

### 4.1 Scope
- `PlannerAgent` intent classification.  
- `BibleMentor`, `ChessMentor`, `StockMentor` logic.  
- Utility functions (`/lib/utils`, `/lib/tools`).  
- Theme switching and mentor registry.

### 4.2 Example

```ts
import { classifyIntent } from "@/lib/planner";

test("detects chess query", () => {
  expect(classifyIntent("what is the best move")).toBe("chess");
});
4.3 Guidelines
Use Vitest for fast runs.

Achieve 80%+ coverage for logic modules.

Avoid external network calls — mock all APIs.

5. Integration Testing
5.1 Purpose
Verify that mentors, APIs, and external tools communicate correctly.

5.2 Example Test Flow
bash
Copy code
POST /api/chat
↓
PlannerAgent → ChessMentor → Stockfish API → Response
5.3 Example Code
ts
Copy code
import request from "supertest";
import app from "../src/server";

test("chess mentor integration", async () => {
  const res = await request(app)
    .post("/api/chat")
    .send({ message: "analyze this FEN", fen: "rnbqkbnr/pppppppp/8/..." });
  expect(res.status).toBe(200);
  expect(res.body.mentor).toBe("chess");
  expect(res.body.response).toContain("Best move");
});
5.4 Mocking
Use msw (Mock Service Worker) to intercept Stockfish / API calls.

Supabase mocked via supabase-js-mock or test database instance.

6. End-to-End Testing (Playwright)
6.1 Objective
Validate real user flows:

Chat initialization

Mentor switching

File upload

Message persistence

6.2 Example Scenario
pgsql
Copy code
1. Open app
2. Type "show me chess moves"
3. Observe mentor switch to Chess ♟️
4. See valid move recommendation
6.3 Sample Script
ts
Copy code
import { test, expect } from "@playwright/test";

test("auto mentor switch to chess", async ({ page }) => {
  await page.goto("/");
  await page.fill('[data-testid="chat-input"]', "show me chess openings");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-testid='mentor-name']")).toHaveText("Chess Mentor");
});
7. UI Component Testing
Component	Checks
<ChatWindow />	Message rendering, scroll behavior.
<MessageInput />	Input events, file upload triggers.
<Sidebar />	Mentor selector toggles, session navigation.
<ContextBar />	Displays correct mentor and state.

Use Vue Testing Library:

```ts
import { render, screen } from '@testing-library/vue';
import ContextBar from './ContextBar.vue';

test('renders the correct mentor context', async () => {
  const mentor = 'Bible';
  render(ContextBar, { props: { mentor } });
  expect(screen.getByText(/Bible Mentor/)).toBeInTheDocument();
});
```
8. Database Testing (Supabase)
8.1 Local Test Database
Use supabase start to spin up a local container.

8.2 Schema Validation
Run migration diff tests:

bash
Copy code
supabase db diff --linked
8.3 Example pgTAP Test
sql
Copy code
BEGIN;
SELECT plan(2);
SELECT has_table('conversations');
SELECT col_is_unique('users', 'email');
ROLLBACK;
8.4 RLS Verification
Test that users cannot query others’ data via SQL injection or direct API calls.

9. Performance Testing
9.1 Objective
Ensure mentors and external tools respond within acceptable latency.

Component	Target	Tool
Chat API	< 1s avg latency	Artillery
Stockfish API	< 2s for depth=12	K6
Supabase query	< 500ms	Postgres EXPLAIN ANALYZE

9.2 Example Load Script
yaml
Copy code
config:
  target: "https://mentor-system.vercel.app/api/chat"
  phases:
    - duration: 30
      arrivalRate: 5
scenarios:
  - flow:
      - post:
          url: "/api/chat"
          json:
            message: "Analyze chess move e4"
10. Security Testing
Check	Method
API Key Exposure	Verify .env excluded from build.
Auth Enforcement	Supabase RLS tests.
File Upload Safety	MIME check + virus scan stub.
Rate Limiting	Ensure API rejects floods.

Run with automated scripts or via CI job:

bash
Copy code
npm run security:audit
11. Continuous Integration (CI) Setup
Stage	Description
Lint / Typecheck	ESLint, Prettier, TypeScript strict mode.
Unit / Integration Tests	Vitest suite.
E2E (staging)	Playwright on Vercel preview.
Supabase Migration Check	CLI diff validation.
Artifact Upload	Logs and coverage reports.

Example GitHub Action:

yaml
Copy code
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint && npm run test:unit
12. Acceptance Criteria per Slice
Slice	Key Tests	Pass Condition
1	Chat sends/receives messages.	Message persists in Supabase.
2	Mentor routing correct.	Intent classification accuracy ≥ 90%.
3	Stockfish integration.	API call succeeds within 2s.
4	Data retrieval (Stock/Bible).	Correct indicator / verse retrieved.
5	AgentKit workflows.	Multi-step trace visible in logs.
6	UI personalization.	Mentor icons switch, uploads trigger correct mentor.

13. Debugging & Logs
Local: Verbose mode DEBUG=true prints mentor, tool, and API flow.

Cloud: Supabase edge logs + Sentry integration.

Playwright trace viewer: For flaky UI tests.

14. Test Data & Mock Assets
Asset	Purpose
/tests/data/verses.json	Bible query mock.
/tests/data/fen_positions.json	Chess board samples.
/tests/data/stocks.json	Financial indicators mock.
/tests/uploads/	Example images/PDFs.

15. Reporting
Coverage reports via Vitest + Istanbul.

CI uploads results to Codecov.

Weekly summary in project dashboard (test pass rate, latency metrics).

16. Future Improvements
Snapshot diff testing for mentor responses (LLM regression detection).

Chaos testing for API timeouts.

Automated benchmark comparisons across models (OpenRouter vs Vertex).

In-app “test mode” toggle for mentor simulations.